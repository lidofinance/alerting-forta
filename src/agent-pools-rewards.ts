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

import {Event} from 'ethers'

import {formatLdo} from './utils'
import {ethersProvider} from './ethers'

import LDO_TOKEN_ABI from './abi/LdoToken.json'

import {
  LDO_TOKEN_ADDRESS,
  POOL_REWARDS_STILL_NOT_PROLONGED_ALERT_PERIOD,
  REWARDS_ALERT_PARAMETERS,
} from './constants'

const LDO_NUM_DECIMALS = 18


//! Compare two addresses ignoring letters case
function equal(address1: string | null, address2: string) {
  if (null === address1) {
    return false
  }
  return address1.toLowerCase() === address2.toLowerCase()
}

function formatTimestamp(timestamp: number) {
  return String(new Date(timestamp * 1000))
}

function readAbi(fileName: string) {
  return JSON.parse(readFileSync(`./src/abi/${fileName}.json`, 'utf-8'))
}

const rewardContractAbis = {
  Sushi: {
    manager: readAbi('SushiManager'),
    rewards: readAbi('SushiRewards'),
  },
  Curve: {
    manager: readAbi('CurveManager'),
    rewards: readAbi('CurveRewards'),
  },
  Balancer: {
    manager: readAbi('BalancerManager'),
  },
  OneInch: {
    manager: readAbi('OneInchManager'),
  },
} as any

const ldoToken = new ethers.Contract(LDO_TOKEN_ADDRESS, LDO_TOKEN_ABI, ethersProvider)


let g_pools = {} as any

async function readPeriodFinish(poolName: string) {
  try {
    return +(await g_pools[poolName].manager.period_finish()).toString()
  } catch (err) {
    return +(await g_pools[poolName].rewards.periodFinish()).toString()
  }
}

export async function initialize(currentBlock: number) {
  console.log('[AgentPoolsRewards]')

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
  }
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

  if (periodFinishUpdated !== info.periodFinish) {
    handlePeriodFinishChange(poolName, periodFinishUpdated, findings)
    return
  }

  const now = blockEvent.block.timestamp
  const timeTillEnd = info.periodFinish - now

  if (timeTillEnd < -POOL_REWARDS_STILL_NOT_PROLONGED_ALERT_PERIOD) { // 10 min passed and still not prolonged
    // No need to check time of last RewardAdded event (of rewards contract),
    // because we already know it due to the cached periodFinish has not been updated
    findings.push(Finding.fromObject({
      name: `${poolName} rewards are still not prolonged`,
      description: `${poolName} rewards are still not prolonged 10 min past expiration`,
      alertId: `LDO-${poolName.toUpperCase()}-REWARDS-STILL-NOT-PROLONGED-DEBUG`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    }))
  }
  else if (timeTillEnd <= 0 && !info.periodExpired) { // period has expired
    console.log("timeTillEnd < 0 && !g_periodExpired")
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
  else {
    const beforehands = info.alerts.sort((x: any, y: any) => { return x.beforehandPeriod - y.beforehandPeriod })
    for (let i = 0; i < beforehands.length; i++) {
      const { beforehandPeriod, description, minimumLdo, severity } = beforehands[i]

      if (timeTillEnd < beforehandPeriod && info.lastNotification < info.periodFinish - beforehandPeriod) {
        const sushiRewardsBalance = await ldoToken.balanceOf(info.managerAddress)
        console.log(`${poolName} Manager balance ${formatLdo(sushiRewardsBalance, 3)} LDO`)

        if (minimumLdo !== null) {
          const minLdo = ethers.utils.parseUnits(minimumLdo, LDO_NUM_DECIMALS)
          if (sushiRewardsBalance.gte(minLdo)) {
            continue
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
  }
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = []
  for (const key of Object.keys(g_pools)) {
    await handleRewardExpire(key, blockEvent, findings)
  }

  return findings
}


export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = []

  return findings
}
