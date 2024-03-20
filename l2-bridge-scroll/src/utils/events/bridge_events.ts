import { FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { RoleHashToName } from '../constants'

export function getBridgeEvents(
  L2_ERC20_TOKEN_GATEWAY_ADDRESS: string,
  RolesAddrToNameMap: RoleHashToName,
): EventOfNotice[] {
  const uniqueKeys: string[] = [
    'be8452bb-c4c6-4526-9489-b04626ec4c4d',
    'e3e767b1-de01-4695-84c7-5654567cf501',
    'ff634c6e-e42c-4432-80e8-b1b4133c7478',
    '3da97319-97cc-4124-85fd-96253be17368',
    '8f775e16-a0f0-4232-a83d-6741825cd0e5',
    '077579cd-d178-422e-ab76-3f3e3bf6c533',
    'cae6f704-391f-4862-9ae4-6b4dae289cc8',
    'f3e7baf3-f8cb-48bf-821a-3fec05222497',
  ]

  return [
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
      event: 'event Initialized(address indexed admin)',
      alertId: 'L2-BRIDGE-IMPLEMENTATION-INITIALIZED',
      name: '🚨🚨🚨 Mantle L2 Bridge: Implementation initialized',
      description: (args: Result) =>
        `Implementation of the Mantle L2 Bridge was initialized by ${args.admin}\n` +
        `NOTE: This is not the thing that should be left unacted! ` +
        `Make sure that this call was made by Lido!`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
      event: 'event DepositsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
      name: '🚨 Mantle L2 Bridge: Deposits Disabled',
      description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
      event:
        'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
      alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
      name: '🚨 Mantle L2 Bridge: Role Admin changed',
      description: (args: Result) =>
        `Role Admin for role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
      event: 'event WithdrawalsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
      name: '🚨 Mantle L2 Bridge: Withdrawals Disabled',
      description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-GRANTED',
      name: '⚠️ Mantle L2 Bridge: Role granted',
      description: (args: Result) =>
        `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-REVOKED',
      name: '⚠️ Mantle L2 Bridge: Role revoked',
      description: (args: Result) =>
        `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
      event: 'event DepositsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
      name: 'ℹ️ Mantle L2 Bridge: Deposits Enabled',
      description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
      event: 'event WithdrawalsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-ENABLED',
      name: 'ℹ️ Mantle L2 Bridge: Withdrawals Enabled',
      description: (args: Result) => `Withdrawals were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
  ]
}
