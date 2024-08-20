import { FindingSeverity, FindingType } from 'forta-agent'
import { App } from '../../common/agent'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../common/entity/events'
import { Constants, RoleHashToName, DEFAULT_ROLES_MAP, TransparentProxyInfo, getHugeWithdrawalsFromL2AlertFactory } from '../../common/constants'

const L2_NAME = 'ZkSync'
const L2_PROXY_ADMIN_CONTRACT_ADDRESS = '0xbd80e505ecc49bae2cc86094a78fa0e2db28b52a';
export const zksyncConstants: Constants = {
  L2_NAME: L2_NAME,
  L2_NETWORK_RPC: 'https://mainnet.era.zksync.io', // 'https://zksync.drpc.org'
  MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST: 50_000,
  L2_NETWORK_ID: 324,
  L2_APPROX_BLOCK_TIME_SECONDS: 1, // see info at https://zksync.blockscout.com/
  L2_PROXY_ADMIN_CONTRACT_ADDRESS,
  govExecutor: {
    name: 'ZKSYNC_GOV_EXECUTOR',
    address: '0x139ee25dcad405d2a038e7a67f9ffdbf0f573f3c',
    proxyAdminAddress: L2_PROXY_ADMIN_CONTRACT_ADDRESS,
  },
  L1_ERC20_TOKEN_GATEWAY_ADDRESS: '0x41527b2d03844db6b0945f25702cb958b6d55989',
  L2_ERC20_TOKEN_GATEWAY: {
    name: 'L2_ERC20_TOKEN_GATEWAY',
    address: '0xe1d6a50e7101c8f8db77352897ee3f1ac53f782b',
  },
  L2_WSTETH_BRIDGED: {
    name: 'ZKSYNC_WSTETH_BRIDGED',
    address: '0x703b52F2b28fEbcB60E1372858AF5b18849FE867',
    proxyAdminAddress: L2_PROXY_ADMIN_CONTRACT_ADDRESS,
  },
  rolesMap: DEFAULT_ROLES_MAP,
  withdrawalInfo: {
    eventName: 'WithdrawalInitiated',
    eventDefinition: `event WithdrawalInitiated(
    address indexed l2Sender,
    address indexed l1Receiver,
    address indexed l2Token,
    uint256 amount
);`,
    amountFieldName: "amount",
  },
  bridgeEvents: [],
  govEvents: [],
  proxyAdminEvents: [],
  getHugeWithdrawalsFromL2Alert: getHugeWithdrawalsFromL2AlertFactory(
    L2_NAME, `C167F276-D519-4906-90CB-C4455E9ABBD4`
  )
}
zksyncConstants.bridgeEvents = getBridgeEvents(zksyncConstants.L2_ERC20_TOKEN_GATEWAY.address, zksyncConstants.rolesMap)
zksyncConstants.govEvents = getGovEvents((zksyncConstants.govExecutor as TransparentProxyInfo).address)
zksyncConstants.proxyAdminEvents = getProxyAdminEvents(
  zksyncConstants.L2_WSTETH_BRIDGED as TransparentProxyInfo,
  zksyncConstants.govExecutor as  TransparentProxyInfo,
)


function getBridgeEvents(
  l2TokenBridgeAddress: string,
  rolesAddrToNameMap: RoleHashToName,
): EventOfNotice[] {
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
      address: l2TokenBridgeAddress,
      event:
        'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
      alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
      name: '🚨 ZkSync L2 Bridge: Role Admin changed',
      description: (args: Result) =>
        `Role Admin for role ${args.role}(${rolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: l2TokenBridgeAddress,
      event: 'event WithdrawalsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
      name: '🚨 ZkSync L2 Bridge: Withdrawals Disabled',
      description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: l2TokenBridgeAddress,
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
      address: l2TokenBridgeAddress,
      event: 'event DepositsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
      name: '🚨 ZkSync L2 Bridge: Deposits Disabled',
      description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: l2TokenBridgeAddress,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-GRANTED',
      name: '⚠️ ZkSync L2 Bridge: Role granted',
      description: (args: Result) =>
        `Role ${args.role}(${rolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: l2TokenBridgeAddress,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-REVOKED',
      name: '⚠️ ZkSync L2 Bridge: Role revoked',
      description: (args: Result) =>
        `Role ${args.role}(${rolesAddrToNameMap.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: l2TokenBridgeAddress,
      event: 'event DepositsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
      name: 'ℹ️ ZkSync L2 Bridge: Deposits Enabled',
      description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: l2TokenBridgeAddress,
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


function getGovEvents(zksyncGovExecutorAddress: string): EventOfNotice[] {
  const uniqueKeys = [
    '0a4af7aa-698e-47b8-adff-ed17cb85c8d4',
    '35c68be6-1704-4e39-b3ee-dd83eb1da978',
    '798b6597-ed63-46d3-9bbc-52422ae7ca15',
    'a87a0cde-b07b-4453-9bb1-9460cc5c2bad',
    '6600c65d-b062-433d-875d-d1e8f16fd774',
    'ed187898-178d-44e0-8dda-3953877fe7fc',
    '1050404a-f321-4c8f-b6a3-496a4acb4408',
    '629d7b0a-0c29-46f3-a1eb-063e16863586',
    '0970504a-6836-4669-b8e4-f4b4139299d4',
  ]

  return [
    {
      address: zksyncGovExecutorAddress,
      event:
        'event EthereumGovernanceExecutorUpdate(address oldEthereumGovernanceExecutor, address newEthereumGovernanceExecutor)',
      alertId: 'GOV-BRIDGE-EXEC-UPDATED',
      name: '🚨 ZkSync Gov Bridge: Ethereum Governance Executor Updated',
      description: (args: Result) =>
        `Ethereum Governance Executor was updated from ` +
        `${args.oldEthereumGovernanceExecutor} to ${args.newEthereumGovernanceExecutor}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: zksyncGovExecutorAddress,
      event: 'event GuardianUpdate(address oldGuardian, address newGuardian)',
      alertId: 'GOV-BRIDGE-GUARDIAN-UPDATED',
      name: '🚨 ZkSync Gov Bridge: Guardian Updated',
      description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: zksyncGovExecutorAddress,
      event: 'event DelayUpdate(uint256 oldDelay, uint256 newDelay)',
      alertId: 'GOV-BRIDGE-DELAY-UPDATED',
      name: '⚠️ ZkSync Gov Bridge: Delay Updated',
      description: (args: Result) => `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: zksyncGovExecutorAddress,
      event: 'event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)',
      alertId: 'GOV-BRIDGE-GRACE-PERIOD-UPDATED',
      name: '⚠️ ZkSync Gov Bridge: Grace Period Updated',
      description: (args: Result) =>
        `Grace Period was updated from ` + `${args.oldGracePeriod} to ${args.newGracePeriod}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: zksyncGovExecutorAddress,
      event: 'event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)',
      alertId: 'GOV-BRIDGE-MIN-DELAY-UPDATED',
      name: '⚠️ ZkSync Gov Bridge: Min Delay Updated',
      description: (args: Result) =>
        `Min Delay was updated from ` + `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: zksyncGovExecutorAddress,
      event: 'event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)',
      alertId: 'GOV-BRIDGE-MAX-DELAY-UPDATED',
      name: '⚠️ ZkSync Gov Bridge: Max Delay Updated',
      description: (args: Result) =>
        `Max Delay was updated from ` + `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: zksyncGovExecutorAddress,
      event:
        'event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)',
      alertId: 'GOV-BRIDGE-ACTION-SET-QUEUED',
      name: 'ℹ️ ZkSync Gov Bridge: Action set queued',
      description: (args: Result) => `Action set ${args.id} was queued`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: zksyncGovExecutorAddress,
      event: 'event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)',
      alertId: 'GOV-BRIDGE-ACTION-SET-EXECUTED',
      name: 'ℹ️ ZkSync Gov Bridge: Action set executed',
      description: (args: Result) => `Action set ${args.id} was executed`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
    {
      address: zksyncGovExecutorAddress,
      event: 'event ActionsSetCanceled(uint256 indexed id)',
      alertId: 'GOV-BRIDGE-ACTION-SET-CANCELED',
      name: 'ℹ️ ZkSync Gov Bridge: Action set canceled',
      description: (args: Result) => `Action set ${args.id} was canceled`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[8],
    },
  ]
}

function getProxyAdminEvents(
  zksyncWstethBridged: TransparentProxyInfo,
  zksyncBridgeExecutor: TransparentProxyInfo,
): EventOfNotice[] {
  const uniqueKeys = [
    'f9e87d52-9ac5-4f26-8dbb-a2f56c5f06bb',
    '44e4e424-f0ca-41dc-96db-26615f048126',
    'd02105a0-a7e7-4347-84dc-d3a67a632b33',
    'c3dff9f7-0b43-400d-a7aa-c081a9c6291d',
    'b950d684-7b89-4cde-af08-f2906d3b0ac9',
    'ca7d2108-fece-41fd-a262-e6959442fb48',
    '200859ec-c205-44b3-ab55-2939b77a5c05',
    '70377bd2-5047-42a2-9afa-e7222096808e',
  ]

  return [
    {
      address: zksyncWstethBridged.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 ZkSync: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${zksyncWstethBridged.name}(${zksyncWstethBridged.proxyAdminAddress}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: zksyncWstethBridged.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 ZkSync: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${zksyncWstethBridged.name}(${zksyncWstethBridged.proxyAdminAddress}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: zksyncWstethBridged.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 ZkSync: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${zksyncWstethBridged.name}(${zksyncWstethBridged.proxyAdminAddress}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: zksyncWstethBridged.address,
      event: 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
      alertId: 'PROXY-OWNER-TRANSFERRED',
      name: '🚨 ZkSync: Proxy owner transferred',
      description: (args: Result) =>
        `Proxy owner for ${zksyncWstethBridged.name}(${zksyncWstethBridged.proxyAdminAddress}) ` +
        `was changed to ${args.newOwner}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: zksyncBridgeExecutor.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 ZkSync: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${zksyncBridgeExecutor.name}(${zksyncBridgeExecutor.proxyAdminAddress}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: zksyncBridgeExecutor.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 ZkSync: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${zksyncBridgeExecutor.name}(${zksyncBridgeExecutor.proxyAdminAddress}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: zksyncBridgeExecutor.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 ZkSync: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${zksyncBridgeExecutor.name}(${zksyncBridgeExecutor.proxyAdminAddress}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: zksyncBridgeExecutor.address,
      event: 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
      alertId: 'PROXY-OWNER-TRANSFERRED',
      name: '🚨 ZkSync: Proxy owner transferred',
      description: (args: Result) =>
        `Proxy owner for ${zksyncBridgeExecutor.name}(${zksyncBridgeExecutor.proxyAdminAddress}) ` +
        `was changed to ${args.newOwner}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
  ]
}

export default {
  initialize: App.initializeStatic(zksyncConstants),
  handleBlock: App.handleBlockStatic,
}
