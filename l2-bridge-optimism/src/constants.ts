import BigNumber from 'bignumber.js'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

import proxyShortABI from './abi/ProxyShortABI.json'

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18)

export const ROLES = new Map<string, string>([
  ['0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6', 'DEPOSITS DISABLER ROLE'],
  ['0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a', 'DEPOSITS ENABLER ROLE'],
  ['0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c', 'WITHDRAWALS DISABLER ROLE'],
  ['0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d', 'WITHDRAWALS ENABLER ROLE'],
  ['0x0000000000000000000000000000000000000000000000000000000000000000', 'DEFAULT ADMIN ROLE'],
])

// 48 hours
export const MAX_WITHDRAWALS_WINDOW = 60 * 60 * 24 * 2
// 10k wstETH
export const MAX_WITHDRAWALS_SUM = 10000

// ADDRESSES AND EVENTS

export const GOV_BRIDGE_ADDRESS = '0xefa0db536d2c8089685630fafe88cf7805966fc3'
export const L2_ERC20_TOKEN_GATEWAY = '0x8e01013243a96601a86eb3153f0d9fa4fbfb6957'

export const WITHDRAWAL_INITIATED_EVENT =
  'event WithdrawalInitiated(address indexed _l1Token,address indexed _l2Token,address indexed _from,address _to,uint256 _amount,bytes _data)'

type EventOfNotice = {
  address: string
  event: string
  alertId: string
  name: string
  description: CallableFunction
  severity: FindingSeverity
  type: FindingType
}

export const GOV_BRIDGE_EVENTS: EventOfNotice[] = [
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      'event EthereumGovernanceExecutorUpdate(address oldEthereumGovernanceExecutor, address newEthereumGovernanceExecutor)',
    alertId: 'GOV-BRIDGE-EXEC-UPDATED',
    name: '🚨 Optimism Gov Bridge: Ethereum Governance Executor Updated',
    description: (args: Result) =>
      `Ethereum Governance Executor was updated from ` +
      `${args.oldEthereumGovernanceExecutor} to ${args.newEthereumGovernanceExecutor}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: 'event GuardianUpdate(address oldGuardian, address newGuardian)',
    alertId: 'GOV-BRIDGE-GUARDIAN-UPDATED',
    name: '🚨 Optimism Gov Bridge: Guardian Updated',
    description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: 'event DelayUpdate(uint256 oldDelay, uint256 newDelay)',
    alertId: 'GOV-BRIDGE-DELAY-UPDATED',
    name: '⚠️ Optimism Gov Bridge: Delay Updated',
    description: (args: Result) => `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: 'event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)',
    alertId: 'GOV-BRIDGE-GRACE-PERIOD-UPDATED',
    name: '⚠️ Optimism Gov Bridge: Grace Period Updated',
    description: (args: Result) =>
      `Grace Period was updated from ` + `${args.oldGracePeriod} to ${args.newGracePeriod}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: 'event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)',
    alertId: 'GOV-BRIDGE-MIN-DELAY-UPDATED',
    name: '⚠️ Optimism Gov Bridge: Min Delay Updated',
    description: (args: Result) => `Min Delay was updated from ` + `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: 'event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)',
    alertId: 'GOV-BRIDGE-MAX-DELAY-UPDATED',
    name: '⚠️ Optimism Gov Bridge: Max Delay Updated',
    description: (args: Result) => `Max Delay was updated from ` + `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      'event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)',
    alertId: 'GOV-BRIDGE-ACTION-SET-QUEUED',
    name: 'ℹ Optimism Gov Bridge: Action set queued',
    description: (args: Result) => `Action set ${args.id} was queued`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: 'event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)',
    alertId: 'GOV-BRIDGE-ACTION-SET-EXECUTED',
    name: 'ℹ Optimism Gov Bridge: Action set executed',
    description: (args: Result) => `Action set ${args.id} was executed`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: 'event ActionsSetCanceled(uint256 indexed id)',
    alertId: 'GOV-BRIDGE-ACTION-SET-CANCELED',
    name: 'ℹ Optimism Gov Bridge: Action set canceled',
    description: (args: Result) => `Action set ${args.id} was canceled`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
]

export interface LidoProxy {
  name: string
  address: string
  shortABI: string
  functions: Map<string, string>
}

export const LIDO_PROXY_CONTRACTS: LidoProxy[] = [
  {
    name: 'WstETH ERC20Bridged',
    address: '0x1f32b1c2345538c0c6f582fcb022739c4a194ebb',
    shortABI: JSON.stringify(proxyShortABI),
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'L2ERC20TokenGateway',
    address: '0x8e01013243a96601a86eb3153f0d9fa4fbfb6957',
    shortABI: JSON.stringify(proxyShortABI),
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
]

export const PROXY_ADMIN_EVENTS: EventOfNotice[] = LIDO_PROXY_CONTRACTS.map((proxyInfo: LidoProxy) => {
  const eventsDesc: EventOfNotice[] = [
    {
      address: proxyInfo.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Optimism: Proxy ossified',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      description: (_args: Result) =>
        `Proxy for ${proxyInfo.name}(${proxyInfo.address}) was ossified` + `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: proxyInfo.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Optimism: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${proxyInfo.name}(${proxyInfo.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: proxyInfo.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Optimism: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${proxyInfo.name}(${proxyInfo.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: proxyInfo.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Optimism: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${proxyInfo.name}(${proxyInfo.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
  ]
  return eventsDesc
}).reduce((a, b) => [...a, ...b])

export const L2_BRIDGE_EVENTS: EventOfNotice[] = [
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event:
      'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
    alertId: 'L2-BRIDGE-ROLE-ADMIN-CHANGED',
    name: '🚨 Optimism L2 Bridge: Role Admin changed',
    description: (args: Result) =>
      `Role Admin for role ${args.role}(${ROLES.get(args.role) || 'unknown'}) ` +
      `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    alertId: 'L2-BRIDGE-ROLE-GRANTED',
    name: '⚠️ Optimism L2 Bridge: Role granted',
    description: (args: Result) =>
      `Role ${args.role}(${ROLES.get(args.role) || 'unknown'}) ` + `was granted to ${args.account} by ${args.sender}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
    alertId: 'L2-BRIDGE-ROLE-REVOKED',
    name: '⚠️ Optimism L2 Bridge: Role revoked',
    description: (args: Result) =>
      `Role ${args.role}(${ROLES.get(args.role) || 'unknown'}) ` + `was revoked to ${args.account} by ${args.sender}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: 'event DepositsEnabled(address indexed enabler)',
    alertId: 'L2-BRIDGE-DEPOSITS-ENABLED',
    name: '✅ Optimism L2 Bridge: Deposits Enabled',
    description: (args: Result) => `Deposits were enabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: 'event DepositsDisabled(address indexed disabler)',
    alertId: 'L2-BRIDGE-DEPOSITS-DISABLED',
    name: '❌ Optimism L2 Bridge: Deposits Disabled',
    description: (args: Result) => `Deposits were disabled by ${args.disabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: 'event WithdrawalsEnabled(address indexed enabler)',
    alertId: 'L2-BRIDGE-WITHDRAWALS-ENABLED',
    name: '✅ Optimism L2 Bridge: Withdrawals Enabled',
    description: (args: Result) => `Withdrawals were enabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: 'event WithdrawalsDisabled(address indexed disabler)',
    alertId: 'L2-BRIDGE-WITHDRAWALS-DISABLED',
    name: '❌ Optimism L2 Bridge: Withdrawals Disabled',
    description: (args: Result) => `Withdrawals were disabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: 'event Initialized(address indexed admin)',
    alertId: 'L2-BRIDGE-IMPLEMENTATION-INITIALIZED',
    name: '🚨 Optimism L2 Bridge: Implementation initialized',
    description: (args: Result) =>
      `Implementation of the Optimism L2 Bridge was initialized by ${args.admin}\n` +
      `NOTE: This is not the thing that should be left unacted! ` +
      `Make sure that this call was made by Lido!`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
]
