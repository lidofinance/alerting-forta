export const ANCHOR_VAULT_ADDRESS = '0xa2f987a546d4cd1c607ee8141276876c26b72bdf'
export const LIDO_ORACLE_ADDRESS = '0x442af784a788a5bd6f42a01ebe9f287a871243fb'
export const LIDO_ORACLE_COMPLETED_EVENT = 'event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)'
export const ANCHOR_VAULT_REWARDS_COLLECTED_EVENT = 'event RewardsCollected(uint256 steth_amount, uint256 ust_amount)'

export const MAX_REWARDS_SELL_DELAY = 60 * 5 // 10 minutes
export const TRIGGER_PERIOD = 60 * 5 // while rewards are overdue, trigger each 5 minutes
