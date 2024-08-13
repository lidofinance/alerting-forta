import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { Result } from '@ethersproject/abi/lib'

export function getL2BridgeEvents(
  l2TokenGateway: string,
  RolesMap: Map<string, string>,
  networkName: string,
): EventOfNotice[] {
  return [
    {
      address: l2TokenGateway,
      event: 'event Initialized(address indexed admin)',
      alertId: 'L2-BRIDGE-IMPLEMENTATION-INITIALIZED',
      name: `🚨🚨🚨 ${networkName} L2 Bridge: Implementation initialized`,
      description: (args: Result) =>
        `Implementation of the arbitrum L2 Bridge was initialized by ${args.admin}\n` +
        `NOTE: This is not the thing that should be left unacted! ` +
        `Make sure that this call was made by Lido!`,
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway,
      event: 'event DepositsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
      name: `🚨 ${networkName} L2 Bridge: Deposits Disabled`,
      description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway,
      event:
        'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
      alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
      name: `🚨 ${networkName} L2 Bridge: Role Admin changed`,
      description: (args: Result) =>
        `Role Admin for role ${args.role}(${RolesMap.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway,
      event: 'event WithdrawalsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
      name: `🚨 ${networkName} L2 Bridge: Withdrawals Disabled`,
      description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-GRANTED',
      name: `⚠️ ${networkName} L2 Bridge: Role granted`,
      description: (args: Result) =>
        `Role ${args.role}(${RolesMap.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-REVOKED',
      name: `⚠️ ${networkName} L2 Bridge: Role revoked`,
      description: (args: Result) =>
        `Role ${args.role}(${RolesMap.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway,
      event: 'event DepositsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
      name: `ℹ️ ${networkName} L2 Bridge: Deposits Enabled`,
      description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },

    {
      address: l2TokenGateway,
      event: 'event WithdrawalsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-ENABLED',
      name: `ℹ️ ${networkName} L2 Bridge: Withdrawals Enabled`,
      description: (args: Result) => `Withdrawals were enabled by ${args.enabler}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}

export function getL1BridgeEvents(
  l1TokenGateway: string,
  RolesMap: Map<string, string>,
  networkName: string,
): EventOfNotice[] {
  return [
    {
      address: l1TokenGateway,
      event: 'event Initialized(address indexed admin)',
      alertId: 'L1-BRIDGE-IMPLEMENTATION-INITIALIZED',
      name: `🚨🚨🚨 ${networkName} L1 Bridge: Implementation initialized`,
      description: (args: Result) =>
        `Implementation of the ${networkName} L1 Bridge was initialized by ${args.admin}\n` +
        `NOTE: This is not the thing that should be left unacted! \n` +
        `Make sure that this call was made by Lido!`,
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l1TokenGateway,
      event: 'event WithdrawalsDisabled(address indexed disabler)',
      alertId: 'L1-BRIDGE-WITHDRAWALS-DISABLED',
      name: `🚨 ${networkName} L1 Bridge: Withdrawals Disabled`,
      description: (args: Result) => `Withdrawals were disabled by ${args.disabler}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l1TokenGateway,
      event: 'event DepositsDisabled(address indexed disabler)',
      alertId: 'L1-BRIDGE-DEPOSITS-DISABLED',
      name: `🚨 ${networkName} L1 Bridge: Deposits Disabled`,
      description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l1TokenGateway,
      event:
        'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
      alertId: 'L1-BRIDGE-ROLE-ADMIN-CHANGED',
      name: `🚨 ${networkName} L1 Bridge: Role Admin changed`,
      description: (args: Result) =>
        `Role Admin for role ${args.role}(${RolesMap.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l1TokenGateway,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L1-BRIDGE-ROLE-GRANTED',
      name: `⚠️ ${networkName} L1 Bridge: Role granted`,
      description: (args: Result) =>
        `Role ${args.role}(${RolesMap.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l1TokenGateway,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L1-BRIDGE-ROLE-REVOKED',
      name: `⚠️ ${networkName} L1 Bridge: Role revoked`,
      description: (args: Result) =>
        `Role ${args.role}(${RolesMap.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l1TokenGateway,
      event: 'event DepositsEnabled(address indexed enabler)',
      alertId: 'L1-BRIDGE-DEPOSITS-ENABLED',
      name: `ℹ️ ${networkName} L1 Bridge: Deposits Enabled`,
      description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: l1TokenGateway,
      event: 'event WithdrawalsEnabled(address indexed enabler)',
      alertId: 'L1-BRIDGE-WITHDRAWALS-ENABLED',
      name: `ℹ️ ${networkName} L1 Bridge: Withdrawals Enabled`,
      description: (args: Result) => `Withdrawals were enabled by ${args.enabler}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
