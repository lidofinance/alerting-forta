import { FindingSeverity, FindingType } from 'forta-agent'
import { App } from '../../common/agent'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../common/entity/events'
import { Constants, RoleHashToName, ContractInfo, DEFAULT_ROLES_MAP, getHugeWithdrawalsFromL2AlertFactory } from '../../common/constants'

const L2_NAME = 'Mantle'
export const mantleConstants: Constants = {
  L2_NAME: L2_NAME,
  L2_NETWORK_RPC: 'https://rpc.mantle.xyz',
  MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST: 10_000,
  L2_NETWORK_ID: 5000,
  L2_APPROX_BLOCK_TIME_SECONDS: 2,
  L2_PROXY_ADMIN_CONTRACT_ADDRESS: '0x8e34d07eb348716a1f0a48a507a9de8a3a6dce45',
  govExecutor: '0x3a7b055bf88cdc59d20d0245809c6e6b3c5819dd',
  L1_ERC20_TOKEN_GATEWAY_ADDRESS: '0x2D001d79E5aF5F65a939781FE228B267a8Ed468B',
  L2_ERC20_TOKEN_GATEWAY: {
    name: 'L2_ERC20_TOKEN_GATEWAY',
    address: '0x9c46560D6209743968cC24150893631A39AfDe4d',
  },
  L2_WSTETH_BRIDGED: {
    name: 'MANTLE_WSTETH_BRIDGED',
    address: '0x458ed78EB972a369799fb278c0243b25e5242A83',
  },
  rolesMap: DEFAULT_ROLES_MAP,
  withdrawalInfo: {
    eventName: 'WithdrawalInitiated',
    eventDefinition: `event WithdrawalInitiated(
    address indexed _l1Token,
    address indexed _l2Token,
    address indexed _from,
    address _to,
    uint256 _amount,
    bytes _data
)`,
    amountFieldName: "_amount",
  },
  // bridgeEvents: [],
  // govEvents: [],
  // proxyAdminEvents: [],
  getHugeWithdrawalsFromL2Alert: getHugeWithdrawalsFromL2AlertFactory(
    L2_NAME, `51F04709-7E86-4FB3-B53C-24C53C99DA24`
  ),
}
// mantleConstants.bridgeEvents = getBridgeEvents(mantleConstants.L2_ERC20_TOKEN_GATEWAY.address, mantleConstants.rolesMap)
// mantleConstants.govEvents = getGovEvents(mantleConstants.govExecutor as string)
// mantleConstants.proxyAdminEvents = getProxyAdminEvents(
  // mantleConstants.L2_WSTETH_BRIDGED as ContractInfo,
  // mantleConstants.L2_ERC20_TOKEN_GATEWAY
// )


function getBridgeEvents(l2TokenBridgeAddress: string, rolesMap: RoleHashToName): EventOfNotice[] {
  const uniqueKeys = [
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
      address: l2TokenBridgeAddress,
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
      address: l2TokenBridgeAddress,
      event: 'event DepositsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
      name: '🚨 Mantle L2 Bridge: Deposits Disabled',
      description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: l2TokenBridgeAddress,
      event:
        'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
      alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
      name: '🚨 Mantle L2 Bridge: Role Admin changed',
      description: (args: Result) =>
        `Role Admin for role ${args.role}(${rolesMap.get(args.role) || 'unknown'}) ` +
        `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: l2TokenBridgeAddress,
      event: 'event WithdrawalsDisabled(address indexed disabler)',
      alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
      name: '🚨 Mantle L2 Bridge: Withdrawals Disabled',
      description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: l2TokenBridgeAddress,
      event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-GRANTED',
      name: '⚠️ Mantle L2 Bridge: Role granted',
      description: (args: Result) =>
        `Role ${args.role}(${rolesMap.get(args.role) || 'unknown'}) ` +
        `was granted to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: l2TokenBridgeAddress,
      event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
      alertId: 'L2-BRIDGE-ROLE-REVOKED',
      name: '⚠️ Mantle L2 Bridge: Role revoked',
      description: (args: Result) =>
        `Role ${args.role}(${rolesMap.get(args.role) || 'unknown'}) ` +
        `was revoked to ${args.account} by ${args.sender}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: l2TokenBridgeAddress,
      event: 'event DepositsEnabled(address indexed enabler)',
      alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
      name: 'ℹ️ Mantle L2 Bridge: Deposits Enabled',
      description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: l2TokenBridgeAddress,
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

function getGovEvents(GOV_BRIDGE_ADDRESS: string): EventOfNotice[] {
  const uniqueKeys = [
    '0a9a066e-233d-4d00-af58-84b685a42729',
    'a2224ced-9745-45c3-90d2-d95f66f57442',
    'c897edd7-a322-47e6-9470-7a4ff3e260e1',
    'a268ead2-28bf-4b65-959b-8627d91ca8ec',
    '70df46a0-787f-4dc1-98f7-fff387a60ec0',
    'fc487e28-f617-4cce-885a-4f5ae67ce283',
    '6ce3c4b3-1c8f-4cee-98d0-a1e0c44d74d8',
    'fd8271cf-5419-4379-87e3-64cbac2c4fc7',
    '0554e1b6-2a3f-4f4e-88e7-5b74c23fdc25',
  ]

  return [
    {
      address: GOV_BRIDGE_ADDRESS,
      event:
        'event EthereumGovernanceExecutorUpdate(address oldEthereumGovernanceExecutor, address newEthereumGovernanceExecutor)',
      alertId: 'GOV-BRIDGE-EXEC-UPDATED',
      name: '🚨 Mantle Gov Bridge: Ethereum Governance Executor Updated',
      description: (args: Result) =>
        `Ethereum Governance Executor was updated from ` +
        `${args.oldEthereumGovernanceExecutor} to ${args.newEthereumGovernanceExecutor}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event GuardianUpdate(address oldGuardian, address newGuardian)',
      alertId: 'GOV-BRIDGE-GUARDIAN-UPDATED',
      name: '🚨 Mantle Gov Bridge: Guardian Updated',
      description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event DelayUpdate(uint256 oldDelay, uint256 newDelay)',
      alertId: 'GOV-BRIDGE-DELAY-UPDATED',
      name: '⚠️ Mantle Gov Bridge: Delay Updated',
      description: (args: Result) => `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)',
      alertId: 'GOV-BRIDGE-GRACE-PERIOD-UPDATED',
      name: '⚠️ Mantle Gov Bridge: Grace Period Updated',
      description: (args: Result) =>
        `Grace Period was updated from ` + `${args.oldGracePeriod} to ${args.newGracePeriod}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)',
      alertId: 'GOV-BRIDGE-MIN-DELAY-UPDATED',
      name: '⚠️ Mantle Gov Bridge: Min Delay Updated',
      description: (args: Result) =>
        `Min Delay was updated from ` + `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)',
      alertId: 'GOV-BRIDGE-MAX-DELAY-UPDATED',
      name: '⚠️ Mantle Gov Bridge: Max Delay Updated',
      description: (args: Result) =>
        `Max Delay was updated from ` + `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event:
        'event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)',
      alertId: 'GOV-BRIDGE-ACTION-SET-QUEUED',
      name: 'ℹ️ Mantle Gov Bridge: Action set queued',
      description: (args: Result) => `Action set ${args.id} was queued`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)',
      alertId: 'GOV-BRIDGE-ACTION-SET-EXECUTED',
      name: 'ℹ️ Mantle Gov Bridge: Action set executed',
      description: (args: Result) => `Action set ${args.id} was executed`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event ActionsSetCanceled(uint256 indexed id)',
      alertId: 'GOV-BRIDGE-ACTION-SET-CANCELED',
      name: 'ℹ️ Mantle Gov Bridge: Action set canceled',
      description: (args: Result) => `Action set ${args.id} was canceled`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[8],
    },
  ]
}


function getProxyAdminEvents(l2Wsteth: ContractInfo, l2TokenBridge: ContractInfo): EventOfNotice[] {
  const uniqueKeys = [
    '82b39d98-a156-4be2-be48-81a0d237c53a',
    '44367f0e-dbe2-4cb0-b256-1af2c9a38d9f',
    '85bcbe60-df81-46ec-b54a-4f667f6a238d',
    'e719527e-99ee-4345-aa6f-c815d7d4a1b1',
    'e449ed63-f96b-4df8-96a2-f6643e4bc679',
    'cef80661-e44b-47d4-8682-a78d41316953',
    '525a056c-6099-4c02-8fdb-e9ced4a17fbb',
    'e926bca1-8446-4ef7-b610-43748b3fcc91',
  ]

  return [
    {
      address: l2Wsteth.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Mantle: Proxy ossified',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      description: (args: Result) =>
        `Proxy for ${l2Wsteth.name}(${l2Wsteth.address}) was ossified` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: l2Wsteth.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Mantle: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${l2Wsteth.name}(${l2Wsteth.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: l2Wsteth.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Mantle: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${l2Wsteth.name}(${l2Wsteth.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: l2Wsteth.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Mantle: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${l2Wsteth.name}(${l2Wsteth.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },

    {
      address: l2TokenBridge.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Mantle: Proxy ossified',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      description: (args: Result) =>
        `Proxy for ${l2TokenBridge.name}(${l2TokenBridge.address}) was ossified` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: l2TokenBridge.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Mantle: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${l2TokenBridge.name}(${l2TokenBridge.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: l2TokenBridge.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Mantle: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${l2TokenBridge.name}(${l2TokenBridge.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: l2TokenBridge.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Mantle: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${l2TokenBridge.name}(${l2TokenBridge.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
  ]
}


export default {
  initialize: App.initializeStatic(mantleConstants),
  handleBlock: App.handleBlockStatic,
}
