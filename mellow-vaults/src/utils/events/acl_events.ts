import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { ACL_ROLES, VAULT_LIST } from 'constants/common'

const MELLOW_VAULT_STRATEGY_ROLE_ADMIN_CHANGED_EVENT =
  'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)'

const MELLOW_VAULT_STRATEGY_ROLE_GRANTED_EVENT =
  'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)'

const MELLOW_VAULT_STRATEGY_ROLE_REVOKED_EVENT =
  'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)'

export const MELLOW_VAULT_STRATEGY_ACL_EVENTS = [
  MELLOW_VAULT_STRATEGY_ROLE_ADMIN_CHANGED_EVENT,
  MELLOW_VAULT_STRATEGY_ROLE_GRANTED_EVENT,
  MELLOW_VAULT_STRATEGY_ROLE_REVOKED_EVENT,
]

const getBondStrategyNameByAddress = (address: string) =>
  VAULT_LIST.find((vault) => vault.defaultBondStrategy === address)

export const aclNotices: Record<string, EventOfNotice> = {
  RoleAdminChanged: {
    event: MELLOW_VAULT_STRATEGY_ROLE_ADMIN_CHANGED_EVENT,
    alertId: 'MELLOW-VAULT-ROLE-ADMIN-CHANGED',
    name: '🚨 Vault: Role Admin changed',
    description: (args: Result, address: string) =>
      `Mellow Vault [${getBondStrategyNameByAddress(address)?.name}] bond strategy ` +
      `Role Admin for role ${args.role}(${ACL_ROLES.get(args.role) || 'unknown'}) ` +
      `was changed from ${args.previousAdminRole} to ${args.newAdminRole} ` +
      `bond strategy address - ${address}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
    uniqueKey: '12c18264-900b-48a9-bdee-b193b61a36c6',
  },
  RoleGranted: {
    event: MELLOW_VAULT_STRATEGY_ROLE_GRANTED_EVENT,
    alertId: 'MELLOW-VAULT-ROLE-GRANTED',
    name: '🚨 Vault: Role granted',
    description: (args: Result, address: string) =>
      `Mellow Vault [${getBondStrategyNameByAddress(address)?.name}] bond strategy ` +
      `Role ${args.role}(${ACL_ROLES.get(args.role) || 'unknown'}) ` +
      `was granted to ${args.account} by ${args.sender} ` +
      `bond strategy address - ${address}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
    uniqueKey: 'd45a13a5-940c-439f-96e2-2cec78f9de24',
  },
  RoleRevoked: {
    event: MELLOW_VAULT_STRATEGY_ROLE_REVOKED_EVENT,
    alertId: 'MELLOW-VAULT-ROLE-REVOKED',
    name: '🚨  Vault: Role revoked',
    description: (args: Result, address: string) =>
      `Mellow Vault [${getBondStrategyNameByAddress(address)?.name}] bond strategy ` +
      `Role ${args.role}(${ACL_ROLES.get(args.role) || 'unknown'}) ` +
      `was revoked to ${args.account} by ${args.sender} ` +
      `bond strategy address - ${address}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
    uniqueKey: '19ba7243-ff94-45af-aa3d-6b12a7f0b83d',
  },
}
