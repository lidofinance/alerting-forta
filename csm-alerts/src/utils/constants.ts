import BigNumber from 'bignumber.js'

export const ETH_DECIMALS = new BigNumber(10).pow(18)
export const SECONDS_PER_SLOT = 12
export const ONE_HOUR = 60 * 60
export const ONE_DAY = 24 * ONE_HOUR
export const ONE_WEEK = 7 * ONE_DAY
export const ONE_MONTH = ONE_WEEK * 4

// CSModule.srv thresholds
export const MAX_TARGET_SHARE_PERCENT_USED = 95
export const MAX_EMPTY_BATCHES_IN_THE_QUEUE = 30
export const MAX_VALIDATORS_IN_THE_QUEUE = 200
export const MAX_OPERATORS_WITH_SAME_MANAGER_OR_REWARD_ADDRESS = 3
