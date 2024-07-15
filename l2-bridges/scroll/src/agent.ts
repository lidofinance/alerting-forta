import { FindingSeverity, FindingType } from 'forta-agent'
import { App } from '../../common/agent'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../common/entity/events'
import { Constants, RoleHashToName, ContractInfo } from '../../common/constants'


export const scrollConstants: Constants = {
  L2_NAME: 'Scroll',
  L2_NETWORK_RPC: 'https://rpc.scroll.io',
  MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST: 1_000,
  L2_NETWORK_ID: 534352,
  L2_APPROX_BLOCK_TIME_SECONDS: 3,
  L2_PROXY_ADMIN_CONTRACT_ADDRESS: '0x8e34d07eb348716a1f0a48a507a9de8a3a6dce45',
  GOV_BRIDGE_ADDRESS: '0x0c67d8d067e349669dfeab132a7c03a90594ee09',
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
  withdrawalInfo: {
    eventName: 'WithdrawERC20',
    eventDefinition: `event WithdrawERC20(
  address indexed l1Token,
  address indexed l2Token,
  address indexed from,
  address to,
  uint256 amount,
  bytes data
)`,
    amountFieldName: "amount",
  },
  getBridgeEvents,
  getGovEvents,
  getProxyAdminEvents,
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


export function getGovEvents(GOV_BRIDGE_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: GOV_BRIDGE_ADDRESS,
      event:
        'event EthereumGovernanceExecutorUpdate(address oldEthereumGovernanceExecutor, address newEthereumGovernanceExecutor)',
      alertId: 'GOV-BRIDGE-EXEC-UPDATED',
      name: '🚨 Scroll Gov Bridge: Ethereum Governance Executor Updated',
      description: (args: Result) =>
        `Ethereum Governance Executor was updated from ` +
        `${args.oldEthereumGovernanceExecutor} to ${args.newEthereumGovernanceExecutor}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '73EE62B0-E0CF-4527-8E44-566D72667F22',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event GuardianUpdate(address oldGuardian, address newGuardian)',
      alertId: 'GOV-BRIDGE-GUARDIAN-UPDATED',
      name: '🚨 Scroll Gov Bridge: Guardian Updated',
      description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '8C586373-5040-4BDA-8EF8-16CBE582D6B0',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event DelayUpdate(uint256 oldDelay, uint256 newDelay)',
      alertId: 'GOV-BRIDGE-DELAY-UPDATED',
      name: '⚠️ Scroll Gov Bridge: Delay Updated',
      description: (args: Result) => `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: '073F04A8-B232-4671-A34E-D42A3729FE34',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)',
      alertId: 'GOV-BRIDGE-GRACE-PERIOD-UPDATED',
      name: '⚠️ Scroll Gov Bridge: Grace Period Updated',
      description: (args: Result) =>
        `Grace Period was updated from ` + `${args.oldGracePeriod} to ${args.newGracePeriod}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: '26574C78-EBD1-42D3-A9C7-3E4A2976FCB7',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)',
      alertId: 'GOV-BRIDGE-MIN-DELAY-UPDATED',
      name: '⚠️ Scroll Gov Bridge: Min Delay Updated',
      description: (args: Result) =>
        `Min Delay was updated from ` + `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: '35391E05-CBB4-4013-ACA1-A75F8C5D6991',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)',
      alertId: 'GOV-BRIDGE-MAX-DELAY-UPDATED',
      name: '⚠️ Scroll Gov Bridge: Max Delay Updated',
      description: (args: Result) =>
        `Max Delay was updated from ` + `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: '003CCEDE-551A-4310-86A7-F8EC22135C45',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event:
        'event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)',
      alertId: 'GOV-BRIDGE-ACTION-SET-QUEUED',
      name: 'ℹ️ Scroll Gov Bridge: Action set queued',
      description: (args: Result) => `Action set ${args.id} was queued`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: '84D309D8-AB13-4B41-A9CE-8DE4AB77E77A',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)',
      alertId: 'GOV-BRIDGE-ACTION-SET-EXECUTED',
      name: 'ℹ️ Scroll Gov Bridge: Action set executed',
      description: (args: Result) => `Action set ${args.id} was executed`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: '31FE6EEB-4619-4579-9C0B-58EECC3D7724',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event ActionsSetCanceled(uint256 indexed id)',
      alertId: 'GOV-BRIDGE-ACTION-SET-CANCELED',
      name: 'ℹ️ Scroll Gov Bridge: Action set canceled',
      description: (args: Result) => `Action set ${args.id} was canceled`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: '76022839-385E-4AD7-85E9-3739C1CACA09',
    },
  ]
}

export function getProxyAdminEvents(l2WstethContract: ContractInfo, l2GatewayContract: ContractInfo): EventOfNotice[] {
  return [
    {
      address: l2WstethContract.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Scroll: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${l2WstethContract.name}(${l2WstethContract.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '18BA44FB-E5AC-4F7D-A556-3B49D9381B0C',
    },
    {
      address: l2WstethContract.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Scroll: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${l2WstethContract.name}(${l2WstethContract.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '6D0FC28D-0D3E-41D3-8F9A-2A52AFDA7543',
    },
    {
      address: l2WstethContract.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Scroll: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${l2WstethContract.name}(${l2WstethContract.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '913345D0-B591-4699-9E5B-384C2640A9C3',
    },
    {
      address: l2GatewayContract.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Scroll: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${l2GatewayContract.name}(${l2GatewayContract.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'DE3F6E46-984B-435F-B88C-E5198386CCF6',
    },
    {
      address: l2GatewayContract.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Scroll: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${l2GatewayContract.name}(${l2GatewayContract.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'CFA25A7F-69C4-45BE-8CAE-884EE8FEF5CA',
    },
    {
      address: l2GatewayContract.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Scroll: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${l2GatewayContract.name}(${l2GatewayContract.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'B7193990-458E-4F41-ADD9-82848D235F5B',
    },
  ]
}

export default {
  initialize: App.initialize(scrollConstants),
  handleBlock: App.handleBlock,
}
