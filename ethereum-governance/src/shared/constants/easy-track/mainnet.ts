import {
  EASY_TRACK_ADDRESS as easyTrackAddress,
  INCREASE_STAKING_LIMIT_ADDRESS as increaseStakingLimitAddress,
  EVM_SCRIPT_EXECUTOR_ADDRESS as evmExecutorAddress,
  REWARD_PROGRAMS_REGISTRY_ADDRESS as rewardProgramRegistryAddress,
} from 'constants/common'
import { STONKS_TOP_UP_ALLOWED_RECIPIENTS_ADDRESS } from 'constants/stonks'

export const INCREASE_STAKING_LIMIT_ADDRESS = increaseStakingLimitAddress
export const EVM_SCRIPT_EXECUTOR_ADDRESS = evmExecutorAddress
export const REWARD_PROGRAMS_REGISTRY_ADDRESS = rewardProgramRegistryAddress
export const EASY_TRACK_ADDRESS = easyTrackAddress

export const EASY_TRACK_TYPES_BY_FACTORIES = new Map<string, string>([
  [increaseStakingLimitAddress, 'Increase node operator staking limit'],
  ['0x929547490ceb6aeedd7d72f1ab8957c0210b6e51', 'Add referral partner'],
  ['0xe9eb838fb3a288bf59e9275ccd7e124fdff88a9c', 'Remove referral partner'],
  ['0x54058ee0e0c87ad813c002262cd75b98a7f59218', 'Top up referral partner'],
  ['0x1dcfc37719a99d73a0ce25ceecbefbf39938cf2c', 'Add recipient (reWARDS)'],
  ['0x00bb68a12180a8f7e20d8422ba9f81c07a19a79e', 'Remove recipient (reWARDS)'],
  ['0x85d703b2a4bad713b596c647badac9a1e95bb03d', 'Top up recipients (reWARDS)'],
  ['0x00caaef11ec545b192f16313f53912e453c91458', 'Top up recipients (Lego LDO)'],
  ['0x0535a67ea2d6d46f85fe568b7eaa91ca16824fec', 'Top up recipients (Lego DAI)'],
  ['0x84f74733ede9bfd53c1b3ea96338867c94ec313e', 'Top up recipients (RCC DAI)'],
  ['0x4e6d3a5023a38ce2c4c5456d3760357fd93a22cd', 'Top up recipients (PML DAI)'],
  ['0x67fb97abb9035e2e93a7e3761a0d0571c5d7cd07', 'Top up recipients (ATC DAI)'],
  ['0x41F9daC5F89092dD6061E59578A2611849317dc8', 'Top up recipients (GAS ETH)'],
  ['0x009ffa22ce4388d2f5de128ca8e6fd229a312450', 'Top up recipients (Referral Program DAI)'],
  ['0xbd2b6dc189eefd51b273f5cb2d99ba1ce565fb8c', 'Top up recipients (TRP LDO)'],
  ['0x935cb3366faf2cfc415b2099d1f974fd27202b77', 'Add recipient (stETH reWARDS)'],
  ['0x22010d1747cafc370b1f1fbba61022a313c5693b', 'Remove recipient (stETH reWARDS)'],
  ['0x1f2b79fe297b7098875930bba6dd17068103897e', 'Top up recipients (stETH reWARDS)'],
])

export const EASY_TRACK_STONKS_CONTRACTS = [STONKS_TOP_UP_ALLOWED_RECIPIENTS_ADDRESS]
