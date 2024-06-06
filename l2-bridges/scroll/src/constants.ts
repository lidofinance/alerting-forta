import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../common/entity/events'
import { WithdrawERC20Event } from './generated/L2LidoGateway'

export type RoleHashToName = Map<string, string>
export type L2BridgeWithdrawalEvent = WithdrawERC20Event


export const Constants = {
  L2_NAME: 'Scroll',
  L2_NETWORK_RPC: 'https://rpc.scroll.io',
  L2_NETWORK_ID: 534352,
  SCROLL_APPROX_BLOCK_TIME_3_SECONDS: 3,
  L2_PROXY_ADMIN_CONTRACT_ADDRESS: '0x8e34d07eb348716a1f0a48a507a9de8a3a6dce45',
  GOV_BRIDGE_ADDRESS: '0x0c67d8d067e349669dfeab132a7c03a90594ee09',
  L1_WSTETH_ADDRESS: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  L1_ERC20_TOKEN_GATEWAY_ADDRESS: '0x6625c6332c9f91f2d27c304e729b86db87a3f504',
  L2_ERC20_TOKEN_GATEWAY: {
    name: 'L2_ERC20_TOKEN_GATEWAY',
    address: '0x8ae8f22226b9d789a36ac81474e633f8be2856c9',
  },
  L2_WSTETH_BRIDGED: {
    name: 'SCROLL_WSTETH_BRIDGED',
    address: '0xf610a9dfb7c89644979b4a0f27063e9e7d7cda32',
  },
  RolesMap: new Map<string, string>([
    ['0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a', 'DEPOSITS_ENABLER_ROLE'],
    ['0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6', 'DEPOSITS_DISABLER_ROLE'],
    ['0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d', 'WITHDRAWALS_ENABLER_ROLE'],
    ['0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c', 'WITHDRAWALS_DISABLER_ROLE'],
    ['0x0000000000000000000000000000000000000000000000000000000000000000', 'DEFAULT_ADMIN_ROLE'],
  ]),
}


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