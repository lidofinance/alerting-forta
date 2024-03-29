import { FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { RoleHashToName } from '../constants'

export function getBridgeEvents(
  l2GatewayAddress: string,
  RolesAddrToNameMap: RoleHashToName,
): EventOfNotice[] {
  return [
    {
      address: l2GatewayAddress,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'L2-BRIDGE-IMPLEMENTATION-UPGRADED',
      name: '🚨🚨🚨 Scroll L2 Bridge: Implementation upgraded',
      description: (args: Result) =>
        `Implementation of the Scroll L2 Bridge was upgraded by ${args.admin}\n` +
        `NOTE: This is not the thing that should be left unacted! ` +
        `Make sure that this call was made by Lido!`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
      uniqueKey: '5A4853D8-D7BF-4431-B7EC-8A5433E89B6A',
    },
    {
      address: l2GatewayAddress,
      event:'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
      name: '🚨 Scroll L2 Bridge: Role Admin changed',
      description: (args: Result) =>
        `Admin for L2 Token Gateway ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'A04BB85A-7B66-48AC-94CF-59D772DC9063',
    },
    {
      address: l2GatewayAddress,
      event: 'event DepositsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
      name: '🚨 Scroll L2 Bridge: Deposits Disabled',
      description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '7CBC6E3F-BABA-437A-9142-0C1CD8AAA827',
    },
    {
      address: l2GatewayAddress,
      event: 'event WithdrawalsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
      name: '🚨 Scroll L2 Bridge: Withdrawals Disabled',
      description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'C6DBFF28-C12D-4CEC-8087-2F0898F7AEAB',
    },
    {
      address: l2GatewayAddress,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-GRANTED',
      name: '⚠️ Scroll L2 Bridge: Role granted',
      description: (args: Result) =>
        `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: 'F58F36AD-9811-40D7-ACD2-667A7624D85B',
    },
    {
      address: l2GatewayAddress,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-REVOKED',
      name: '⚠️ Scroll L2 Bridge: Role revoked',
      description: (args: Result) =>
        `Role ${args.role}(${RolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: '42816CCE-24C3-4CE2-BC21-4F2202A66EFD',
    },
    {
      address: l2GatewayAddress,
      event: 'event DepositsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
      name: 'ℹ️ Scroll L2 Bridge: Deposits Enabled',
      description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: 'EA60F6DC-9A59-4FAE-8467-521DF56813C5',
    },
    {
      address: l2GatewayAddress,
      event: 'event WithdrawalsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-ENABLED',
      name: 'ℹ️ Scroll L2 Bridge: Withdrawals Enabled',
      description: (args: Result) => `Withdrawals were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: '0CEE896B-6BDD-45C5-9ADD-46A1558F1BBC',
    },
  ]
}
