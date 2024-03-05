import { FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { OProxyContract, RoleHashToName } from '../constants'

export function getL2BridgeEvents(
  L2_ERC20_TOKEN_GATEWAY: OProxyContract,
  RolesAddrToNameMap: RoleHashToName,
): EventOfNotice[] {
  const uniqueKeys = [
    `944ab955-07dc-45e8-9ab0-4ea99add30b7`,
    `47c31672-d4b7-4923-8def-98e3958dbbde`,
    `c768e8e9-a216-40ac-b610-834272344e94`,
    '6a768bc1-4e08-4924-a2e0-5ef7ddc8ceec',
    '77aedba1-41ac-423a-8a78-6526d357d6b3',
    '9f09b503-b447-4b13-9673-4ee3a425c7fb',
    'a1b8afc8-c2d5-48d1-accb-f5ca986248b8',
    '0ae20245-7906-4765-a227-5f79b346a230',
  ]

  return [
    {
      address: L2_ERC20_TOKEN_GATEWAY.address,
      event:
        'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
      alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
      name: '🚨 Base L2 Bridge: Role Admin changed',
      description: (args: Result) =>
        `Role Admin for role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY.address,
      event: 'event WithdrawalsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
      name: '🚨 Base L2 Bridge: Withdrawals Disabled',
      description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY.address,
      event: 'event Initialized(address indexed admin)',
      alertId: 'L2-BRIDGE-IMPLEMENTATION-INITIALIZED',
      name: '🚨 Base L2 Bridge: Implementation initialized',
      description: (args: Result) =>
        `Implementation of the Base L2 Bridge was initialized by ${args.admin}\n` +
        `NOTE: This is not the thing that should be left unacted!\n` +
        `Make sure that this call was made by Lido!`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY.address,
      event: 'event DepositsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
      name: '🚨 Base L2 Bridge: Deposits Disabled',
      description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY.address,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-GRANTED',
      name: '⚠️ Base L2 Bridge: Role granted',
      description: (args: Result) =>
        `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY.address,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-REVOKED',
      name: '⚠️ Base L2 Bridge: Role revoked',
      description: (args: Result) =>
        `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY.address,
      event: 'event DepositsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
      name: 'ℹ️ Base L2 Bridge: Deposits Enabled',
      description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY.address,
      event: 'event WithdrawalsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-ENABLED',
      name: 'ℹ️ Base L2 Bridge: Withdrawals Enabled',
      description: (args: Result) => `Withdrawals were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
  ]
}
