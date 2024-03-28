import { FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { RoleHashToName } from '../constants'

export function getBridgeEvents(L2_ERC20_TOKEN_GATEWAY: string, RolesAddrToNameMap: RoleHashToName): EventOfNotice[] {
  const uniqueKeys = [
    'f760df18-5dfc-4237-a752-b5654a123c48',
    'e0e57c09-17f0-4e37-8308-1d2e666d7fdb',
    'd1b7de38-d0b1-4b52-996a-ca4b32b4af2d',
    '36a0ce4b-0d5d-42b0-a40b-cdf8275cc8b4',
    'bf4843ce-ee15-4e6e-9d8c-c7c6507ce908',
    'a5f4581f-5059-4d1c-b77d-85546b7fb464',
    'e20e7508-7df1-4c5d-964d-b3364cc2465e',
    '9600882e-bbda-4d11-a50a-345f96e13d11',
  ]

  return [
    {
      address: L2_ERC20_TOKEN_GATEWAY,
      event:
        'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
      alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
      name: '🚨 ZkSync L2 Bridge: Role Admin changed',
      description: (args: Result) =>
        `Role Admin for role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY,
      event: 'event WithdrawalsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
      name: '🚨 ZkSync L2 Bridge: Withdrawals Disabled',
      description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY,
      event: 'event Initialized(address indexed admin)',
      alertId: 'L2-BRIDGE-IMPLEMENTATION-INITIALIZED',
      name: '🚨 ZkSync L2 Bridge: Implementation initialized',
      description: (args: Result) =>
        `Implementation of the ZkSync L2 Bridge was initialized by ${args.admin}\n` +
        `NOTE: This is not the thing that should be left unacted! ` +
        `Make sure that this call was made by Lido!`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY,
      event: 'event DepositsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
      name: '🚨 ZkSync L2 Bridge: Deposits Disabled',
      description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-GRANTED',
      name: '⚠️ ZkSync L2 Bridge: Role granted',
      description: (args: Result) =>
        `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-REVOKED',
      name: '⚠️ ZkSync L2 Bridge: Role revoked',
      description: (args: Result) =>
        `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY,
      event: 'event DepositsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
      name: 'ℹ️ ZkSync L2 Bridge: Deposits Enabled',
      description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY,
      event: 'event WithdrawalsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-ENABLED',
      name: 'ℹ️ ZkSync L2 Bridge: Withdrawals Enabled',
      description: (args: Result) => `Withdrawals were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
  ]
}
