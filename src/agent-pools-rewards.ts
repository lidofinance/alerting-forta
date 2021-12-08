import {readFileSync} from 'fs'
import BigNumber from 'bignumber.js'

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from 'forta-agent'


import {ethersProvider} from './ethers'

import {
  LDO_TOKEN_ADDRESS,
  POOL_REWARDS_STILL_NOT_PROLONGED_ALERT_PERIOD,
  REWARDS_ALERT_PARAMETERS,
} from './constants'


import LDO_TOKEN_ABI from './abi/LdoToken.json'
import SUSHI_MANAGER_ABI from './abi/SushiManager.json'
import SUSHI_REWARDS_ABI from './abi/SushiRewards.json'
import CURVE_MANAGER_ABI from './abi/CurveManager.json'
import CURVE_REWARDS_ABI from './abi/CurveRewards.json'
import BALANCER_MANAGER_ABI from './abi/BalancerManager.json'
import ONE_INCH_MANAGER_ABI from './abi/OneInchManager.json'

const rewardContractAbis = {
  Sushi: {
    manager: SUSHI_MANAGER_ABI,
    rewards: SUSHI_REWARDS_ABI,
  },
  Curve: {
    manager: CURVE_MANAGER_ABI,
    rewards: CURVE_REWARDS_ABI,
  },
  Balancer: {
    manager: BALANCER_MANAGER_ABI,
  },
  OneInch: {
    manager: ONE_INCH_MANAGER_ABI
  },
} as any

function formatTimestamp(timestamp: number) {
  return String(new Date(timestamp * 1000))
}

const LDO_NUM_DECIMALS = 18

export const name = 'AgentPoolsRewards'

const ldoToken = new ethers.Contract(LDO_TOKEN_ADDRESS, LDO_TOKEN_ABI, ethersProvider)


//! Keeps parameters of reporting as well as cached values
let g_pools = {} as any


async function readPeriodFinish(poolName: string) {
  try {
    return +(await g_pools[poolName].manager.period_finish()).toString()
  } catch (err) {
    return +(await g_pools[poolName].rewards.periodFinish()).toString()
  }
}

export async function initialize(currentBlock: number): Promise<{[key: string]: string}> {
  console.log(`[${name}]`)

  let metadata: {[key: string]: string} = {}

  for (const [name, config] of Object.entries(REWARDS_ALERT_PARAMETERS)) {
    g_pools[name] = {
      managerAddress: config.managerAddress,
      rewardsAddress: config.rewardsAddress,
      alerts: config.alerts,
      manager: new ethers.Contract(config.managerAddress, rewardContractAbis[name].manager, ethersProvider),
      rewards: undefined,
      periodFinish: 0,
      periodExpired: false,
      lastNotification: 0,
    }
    if (config.rewardsAddress) {
      g_pools[name]['rewards'] = new ethers.Contract(config.rewardsAddress, rewardContractAbis[name].rewards, ethersProvider)
    }

    const periodFinish = await readPeriodFinish(name)
    g_pools[name]['periodFinish'] = periodFinish
    console.log(`${name} reward expiration date is initialized to ${periodFinish}  (${formatTimestamp(periodFinish)})`)
    metadata[name] = `periodFinish: ${periodFinish}  (${formatTimestamp(periodFinish)})`
  }

  return {}
}

async function handlePeriodFinishChange(pool: string, newPeriodFinish: number, findings: Finding[]) {
    console.log(`Rewards prolonged`)
    g_pools[pool].periodFinish = newPeriodFinish
    g_pools[pool].periodExpired = false

    findings.push(Finding.fromObject({
      name: `${pool} rewards prolonged`,
      description: `${pool} rewards successfully prolonged till ${formatTimestamp(g_pools[pool].periodFinish)}`,
      alertId: `LDO-${pool.toUpperCase()}-REWARDS-PROLONGED-DEBUG`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    }))
}

async function handleRewardExpire(poolName: string, blockEvent: BlockEvent, findings: Finding[]) {
  const info = g_pools[poolName]
  const periodFinishUpdated = await readPeriodFinish(poolName)

  const handleStillNotProlonged = function () {
    findings.push(Finding.fromObject({
      name: `${poolName} rewards are still not prolonged`,
      description: `${poolName} rewards are still not prolonged 10 min past expiration`,
      alertId: `LDO-${poolName.toUpperCase()}-REWARDS-STILL-NOT-PROLONGED-DEBUG`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    }))
    info.lastNotification = now
  }

  const handlePeriodExpiration = async function () {
    const sushiRewardsBalance = await ldoToken.balanceOf(info.managerAddress)
    if (sushiRewardsBalance === 0) {
      findings.push(Finding.fromObject({
        name: `${poolName} rewards expired but no LDO`,
        description: `${poolName} rewards expired but no LDO on manager balance`,
        alertId: `LDO-${poolName.toUpperCase()}-REWARDS-EXPIRED-NO-LDO-DEBUG`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      }))
    }
    info.periodExpired = true
  }

  const handleBeforehandPeriod = async function(periodParams: any) {
    const { beforehandPeriod, description, minimumLdo, severity } = periodParams

    const thisPeriodWasAlreadyReported = info.lastNotification >= info.periodFinish - beforehandPeriod
    if (timeTillEnd < beforehandPeriod && !thisPeriodWasAlreadyReported) {
      const sushiRewardsBalance = await ldoToken.balanceOf(info.managerAddress)

      if (minimumLdo !== null) {
        const minLdo = ethers.utils.parseUnits(minimumLdo, LDO_NUM_DECIMALS)
        if (sushiRewardsBalance.gte(minLdo)) {
          return
        }
      }

      info.lastNotification = now
      
      findings.push(Finding.fromObject({
        name: `${poolName} rewards period expiriation`,
        description: description,
        alertId: `LDO-${poolName.toUpperCase()}-REWARDS-EXPIRATION-DEBUG`,
        severity: severity,
        type: FindingType.Info,
      }))
    }
  }

  if (periodFinishUpdated !== info.periodFinish) {
    handlePeriodFinishChange(poolName, periodFinishUpdated, findings)
    return
  }

  const now = blockEvent.block.timestamp
  const timeTillEnd = info.periodFinish - now

  const stillNotProlongedWasAlreadyReported = info.lastNotification >= info.periodFinish + POOL_REWARDS_STILL_NOT_PROLONGED_ALERT_PERIOD
  if (timeTillEnd < -POOL_REWARDS_STILL_NOT_PROLONGED_ALERT_PERIOD && !stillNotProlongedWasAlreadyReported) { // 10 min passed and still not prolonged
    // No need to check time of last RewardAdded event (of rewards contract),
    // because we already know it due to the cached periodFinish has not been updated
    handleStillNotProlonged()
  }
  else if (timeTillEnd <= 0 && !info.periodExpired) { // period has expired
    await handlePeriodExpiration()
  }
  else {
    const beforehands = info.alerts.sort((x: any, y: any) => { return x.beforehandPeriod - y.beforehandPeriod })
    for (let i = 0; i < beforehands.length; i++) {
      console.log(`${poolName} period ${beforehands[i].beforehandPeriod}`)
      handleBeforehandPeriod(beforehands[i])
    }
  }
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = []

  for (const key of Object.keys(g_pools)) {
    await handleRewardExpire(key, blockEvent, findings)
  }

  return findings
}

