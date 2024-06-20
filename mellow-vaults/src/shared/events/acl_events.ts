import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { ACL_ROLES } from 'constants/common'

export function getACLEvents(DEFAULT_BOND_STRATEGY_ADDRESS: string): EventOfNotice[] {
  const uniqueKeys = [
    '12c18264-900b-48a9-bdee-b193b61a36c6',
    'd45a13a5-940c-439f-96e2-2cec78f9de24',
    '19ba7243-ff94-45af-aa3d-6b12a7f0b83d',
  ]

  return [
    {
      address: DEFAULT_BOND_STRATEGY_ADDRESS,
      event:
        'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
      alertId: 'MELLOW-VAULT-ROLE-ADMIN-CHANGED',
      name: '🚨 Vault: Role Admin changed',
      description: (args: Result) =>
        `Role Admin for role ${args.role}(${ACL_ROLES.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole} ` +
        `bond strategy address - ${DEFAULT_BOND_STRATEGY_ADDRESS}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: DEFAULT_BOND_STRATEGY_ADDRESS,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'MELLOW-VAULT-ROLE-GRANTED',
      name: '🚨 Vault: Role granted',
      description: (args: Result) =>
        `Role ${args.role}(${ACL_ROLES.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender} ` +
        `bond strategy address - ${DEFAULT_BOND_STRATEGY_ADDRESS}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: DEFAULT_BOND_STRATEGY_ADDRESS,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'MELLOW-VAULT-ROLE-REVOKED',
      name: '🚨  Vault: Role revoked',
      description: (args: Result) =>
        `Role ${args.role}(${ACL_ROLES.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender} ` +
        `bond strategy address - ${DEFAULT_BOND_STRATEGY_ADDRESS}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
  ]
}
