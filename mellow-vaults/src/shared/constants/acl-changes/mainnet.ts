import { INamedRole } from '../../string'

import {
  MELLOW_VAULT_PROXY_ADDRESS as vaultProxyAddress,
  MELLOW_VAULT_PROXY_OWNER as vaultProxyOwner,
} from 'constants/common'

export const NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL = 24 * 60 * 60 // 24h
export const NEW_OWNER_IS_EOA_REPORT_INTERVAL = 60 * 60 // 1h

export const AclEnumerableABI = [
  'function getRoleMember(bytes32, uint256) view returns (address)',
  'function getRoleMemberCount(bytes32) view returns (uint256)',
]

// Rewards contracts allowed owners
export const WHITELISTED_OWNERS = [vaultProxyOwner]

export interface IOwnable {
  name: string
  ownershipMethod: string
  ownerAddress?: string
}

// List of contracts to monitor for owner
export const OWNABLE_CONTRACTS = new Map<string, IOwnable>([
  [
    vaultProxyAddress,
    {
      name: 'Mellow Vault upgradeable Proxy Admin',
      ownershipMethod: 'owner',
    },
  ],
])

export interface IHasRoles {
  name: string
  roles: Map<INamedRole, string[]>
}
