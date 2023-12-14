import { FindingSeverity, FindingType } from 'forta-agent'
import { L2_ERC20_TOKEN_GATEWAY_ADDRESS, RolesAddrToNameMap } from '../constants'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'

export const L2_BRIDGE_EVENTS: EventOfNotice[] = [
  {
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
    event:
      'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
    alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
    name: '🚨 Linea L2 Bridge: Role Admin changed',
    description: (args: Result) =>
      `Role Admin for role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
      `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
    event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    alertId: 'L2-BRIDGE-ROLE-GRANTED',
    name: '⚠️ Linea L2 Bridge: Role granted',
    description: (args: Result) =>
      `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
      `was granted to ${args.account} by ${args.sender}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
    event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
    alertId: 'L2-BRIDGE-ROLE-REVOKED',
    name: '⚠️ Linea L2 Bridge: Role revoked',
    description: (args: Result) =>
      `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
      `was revoked to ${args.account} by ${args.sender}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
    event: 'event DepositsEnabled(address indexed enabler)',
    alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
    name: '✅ Linea L2 Bridge: Deposits Enabled',
    description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
    event: 'event DepositsDisabled(address indexed disabler)',
    alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
    name: '❌ Linea L2 Bridge: Deposits Disabled',
    description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
    event: 'event WithdrawalsEnabled(address indexed enabler)',
    alertId: 'L2-BRIDGE-WITHDRAWALS-ENABLED',
    name: '✅ Linea L2 Bridge: Withdrawals Enabled',
    description: (args: Result) => `Withdrawals were enabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
    event: 'event WithdrawalsDisabled(address indexed disabler)',
    alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
    name: '❌ Linea L2 Bridge: Withdrawals Disabled',
    description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
    event: 'event Initialized(address indexed admin)',
    alertId: 'L2-BRIDGE-IMPLEMENTATION-INITIALIZED',
    name: '🚨 Linea L2 Bridge: Implementation initialized',
    description: (args: Result) =>
      `Implementation of the Linea L2 Bridge was initialized by ${args.admin}\n` +
      `NOTE: This is not the thing that should be left unacted! ` +
      `Make sure that this call was made by Lido!`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
]
