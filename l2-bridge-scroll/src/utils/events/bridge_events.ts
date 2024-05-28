import { FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { RoleHashToName } from '../constants'

export function getBridgeEvents(l2GatewayAddress: string, RolesAddrToNameMap: RoleHashToName): EventOfNotice[] {
  return [
    {
      address: l2GatewayAddress,
      event: 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
      alertId: 'L2-BRIDGE-OWNER-CHANGED',
      name: '🚨 Scroll: L2 gateway owner changed',
      description: (args: Result) =>
        `Owner of L2LidoGateway ${l2GatewayAddress} was changed to ${args.newOwner} (detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '136546BE-E1BF-40DA-98FB-17B741E12A35',
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
      event: 'event Initialized(uint8 version)',
      alertId: 'L2-BRIDGE-INITIALIZED',
      name: '🚨 Scroll L2 Bridge: (re-)initialized',
      description: (args: Result) =>
        `Implementation of the Scroll L2 Bridge was initialized by version: ${args.version}\n` +
        `NOTE: This is not the thing that should be left unacted! ` +
        `Make sure that this call was made by Lido!`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'E42BC7A0-0715-4D55-AB9D-0A041F639B20',
    },
  ]
}
