import BigNumber from 'bignumber.js'

export type StakingLimitInfo = {
  maxStakeLimit: BigNumber
  currentStakeLimit: BigNumber
  isStakingPaused: boolean
}
