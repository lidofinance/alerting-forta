import { strict as assert } from 'assert'

import {
  ethers,
  BlockEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from 'forta-agent'


import {ethersProvider} from './ethers'

import {
  LDO_TOKEN_ADDRESS,
  MAX_DELAY_OF_POOL_REWARDS_PERIOD_PROLONGATION,
  POOL_REWARDS_ALERTS_PERIODS_PARAMS,
  POOLS_PARAMS,
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

//! Don't report if time passed since report moment is greater than REPORT_WINDOW
const REPORT_WINDOW = 60 * 60 // 1 hour


//! Keeps parameters of reporting as well as cached values
let g_pools = {} as any


function arePeriodsSorted(periods: any) {
  return periods.every((v: any, i: number, arr: any) => !i || arr[i-1].period <= v.period)
}

async function readPeriodFinish(poolName: string) {
  try {
    return +(await g_pools[poolName].manager.period_finish()).toString()
  } catch (err) {
    const rewardsContract = g_pools[poolName].rewards
    if (!rewardsContract) {
      throw `rewardsContract is undefined but is needed to get periodFinish (${poolName})`
    }
    return +(await rewardsContract.periodFinish()).toString()
  }
}

export async function initialize(currentBlock: number): Promise<{[key: string]: string}> {
  console.log(`[${name}]`)
  assert(arePeriodsSorted(POOL_REWARDS_ALERTS_PERIODS_PARAMS), 'Alert periods parameters must be sorted by period ascending')

  let metadata: {[key: string]: string} = {}

  for (const [poolName, poolParams] of Object.entries(POOLS_PARAMS)) {
    g_pools[poolName] = {
      ...poolParams,
      manager: new ethers.Contract(poolParams.managerAddress, rewardContractAbis[poolName].manager, ethersProvider),
      rewards: undefined,
      periodFinish: 0,
      periodExpired: false,
      lastNotification: 0,
    }

    if (poolParams.rewardsAddress) {
      g_pools[poolName]['rewards'] = new ethers.Contract(poolParams.rewardsAddress, rewardContractAbis[poolName].rewards, ethersProvider)
    }

    const periodFinish = await readPeriodFinish(poolName)
    g_pools[poolName]['periodFinish'] = periodFinish
    console.log(`${poolName} reward expiration date is initialized to ${periodFinish}  (${formatTimestamp(periodFinish)})`)
    metadata[poolName] = `periodFinish: ${periodFinish}  (${formatTimestamp(periodFinish)})`
  }

  return metadata
}

async function handlePeriodFinishChange(poolName: string, newPeriodFinish: number, findings: Finding[]) {
    console.log(`Rewards prolonged`)
    g_pools[poolName].periodFinish = newPeriodFinish
    g_pools[poolName].periodExpired = false

    findings.push(Finding.fromObject({
      name: `${poolName} rewards prolonged`,
      description: `${poolName} rewards successfully prolonged till ${formatTimestamp(g_pools[poolName].periodFinish)}`,
      alertId: `LDO-${poolName.toUpperCase()}-REWARDS-PROLONGED`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    }))
}

async function handleRewardExpire(poolName: string, blockEvent: BlockEvent, findings: Finding[]) {
  let poolInfo = g_pools[poolName]
  const periodFinishUpdated = await readPeriodFinish(poolName)

  const handleStillNotProlonged = function () {
    findings.push(Finding.fromObject({
      name: `${poolName} rewards are still not prolonged`,
      description: `${poolName} rewards are still not prolonged 10 min past expiration`,
      alertId: `LDO-${poolName.toUpperCase()}-REWARDS-STILL-NOT-PROLONGED`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    }))
    poolInfo.lastNotification = now
  }

  const handlePeriodExpiration = async function () {
    const rewardsBalance = await ldoToken.balanceOf(poolInfo.managerAddress)
    if (rewardsBalance === 0) {
      findings.push(Finding.fromObject({
        name: `${poolName} rewards expired but no LDO`,
        description: `${poolName} rewards expired but no LDO on manager balance`,
        alertId: `LDO-${poolName.toUpperCase()}-REWARDS-EXPIRED-NO-LDO`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      }))
    }
    poolInfo.periodExpired = true
  }

  const handleBeforehandPeriod = async function(periodParams: any) {
    const { period, description, minManagerLdoBalance, severity, pools } = periodParams
    if (!pools.includes(poolName)) {
      return
    }

    const thisPeriodWasAlreadyReported = poolInfo.lastNotification >= poolInfo.periodFinish - period
    const hasReportWindowClosed = period - timeTillEnd > REPORT_WINDOW
    if (timeTillEnd < period && !hasReportWindowClosed && !thisPeriodWasAlreadyReported) {
      const poolManagerBalance = await ldoToken.balanceOf(poolInfo.managerAddress)

      if (minManagerLdoBalance !== null) {
        const minLdo = ethers.utils.parseUnits(minManagerLdoBalance, LDO_NUM_DECIMALS)
        if (poolManagerBalance.gte(minLdo)) {
          return
        }
      }

      poolInfo.lastNotification = now
      findings.push(Finding.fromObject({
        name: `${poolName} rewards period expiriation`,
        description: description(poolName),
        alertId: `LDO-${poolName.toUpperCase()}-REWARDS-EXPIRATION`,
        severity: severity,
        type: FindingType.Info,
      }))
    }
  }

  if (periodFinishUpdated !== poolInfo.periodFinish) {
    handlePeriodFinishChange(poolName, periodFinishUpdated, findings)
    return
  }

  const now = blockEvent.block.timestamp
  const timeTillEnd = poolInfo.periodFinish - now

  const maxDelay = MAX_DELAY_OF_POOL_REWARDS_PERIOD_PROLONGATION
  const stillNotProlongedWasAlreadyReported = poolInfo.lastNotification >= poolInfo.periodFinish + maxDelay
  if (timeTillEnd < -maxDelay && !stillNotProlongedWasAlreadyReported) { // 10 min passed and still not prolonged
    // No need to check time of last RewardAdded event (of rewards contract),
    // because we already know it due to the cached periodFinish has not been updated
    handleStillNotProlonged()
  }
  else if (timeTillEnd <= 0 && !poolInfo.periodExpired) { // period has expired
    await handlePeriodExpiration()
  }
  else {
    for (let i = 0; i < POOL_REWARDS_ALERTS_PERIODS_PARAMS.length; i++) {
      await handleBeforehandPeriod(POOL_REWARDS_ALERTS_PERIODS_PARAMS[i])
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

