export const CROSS_CHAIN_EXECUTOR_ADDRESS = '0x8e5175d17f74d1d512de59b2f5d5a5d8177a123d'
export const CROSS_CHAIN_CONTROLLER_ADDRESS = '0x40c4464fca8cacd550c33b39d674fc257966022f'
export const PERIODICAL_BLOCK_INTERVAL = 20 * 5 // 5 min in blocks
export const HOUR_IN_BLOCKS = 20 * 60 // 60 min in blocks

export enum ENVELOPE_STATE {
  NONE,
  CONFIRMED,
  DELIVERED,
}

// ACL
export const NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL = 24 * 60 * 60 // 24h
export const NEW_OWNER_IS_EOA_REPORT_INTERVAL = 60 * 60 // 1h

// Rewards contracts allowed owners
export const WHITELISTED_OWNERS = [CROSS_CHAIN_EXECUTOR_ADDRESS]

export interface IOwnable {
  name: string
  ownershipMethod: string
  ownerAddress?: string
}

// List of contracts to monitor for owner
export const OWNABLE_CONTRACTS = new Map<string, IOwnable>([
  [
    CROSS_CHAIN_CONTROLLER_ADDRESS,
    {
      name: 'BSC ADI upgradeable Proxy Admin',
      ownershipMethod: 'owner',
    },
  ],
])
