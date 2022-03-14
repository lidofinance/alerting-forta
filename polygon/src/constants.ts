import BigNumber from "bignumber.js";
import { FindingSeverity, FindingType } from "forta-agent";

// COMMON CONSTS
export const MATIC_DECIMALS = new BigNumber(10 ** 18);

// 24 hours
export const FULL_24_HOURS = 24 * 60 * 60;

// ADDRESSES
export const MATIC_TOKEN_ADDRESS = "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0";
export const ST_MATIC_TOKEN_ADDRESS = "0x9ee91f9f426fa633d227f7a9b000e28b9dfd8599";
export const PROXY_ADMIN_ADDRESS = "0x0833f5bd45803e05ef54e119a77e463ce6b1a963";

export const OWNER_MULTISIG_ADDRESS = "0xd65fa54f8df43064dfd8ddf223a446fc638800a9";
export const LIDO_ON_POLYGON_PROXIES = {
  lido_nft_proxy: "0x60a91E2B7A1568f0848f3D43353C453730082E46",
  stMATIC_proxy: "0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599",
  validator_factory_proxy: "0x0a6C933495a7BB768d95f4667B074Dd5b95b78eB",
  node_operator_registry_proxy: "0x797C1369e578172112526dfcD0D5f9182067c928",
};

// EVENT ABIs
export const PROXY_ADMIN_OWNERSHIP_TRANSFERRED_EVENT =
  "event OwnershipTransferred (address indexed previousOwner, address indexed newOwner)";

export const ST_MATIC_DISTRIBUTE_REWARDS_EVENT =
  "event DistributeRewardsEvent(uint256 indexed _amount)";

type StMaticAdminEvent = {
	address: string
	event: string
	alertId: string
	name: string
	description: CallableFunction
	severity: FindingSeverity
	type: FindingType
}

export const ST_MATIC_ADMIN_EVENTS: StMaticAdminEvent[] = [
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: 'event Paused(address account)',
        alertId: 'STMATIC-CONTRACT-PAUSED',
        name: 'stMATIC: stMATIC contract was paused',
        description: (args: any) => `stMATIC contract was paused by ${args.account}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
    },
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: 'event Unpaused(address account)',
        alertId: 'STMATIC-CONTRACT-UNPAUSED',
        name: 'stMATIC: stMATIC contract was unpaused',
        description: (args: any) => `stMATIC contract was unpaused by ${args.account}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
    },
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
        alertId: 'STMATIC-CONTRACT-ROLE-GRANTED',
        name: 'stMATIC: stMATIC RoleGranted',
        description: (args: any) => `Role ${args.role} was granted to ${args.account} by ${args.sender}`,
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
    },
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
        alertId: 'STMATIC-CONTRACT-ROLE-REVOKED',
        name: 'stMATIC: stMATIC RoleRevoked',
        description: (args: any) => `Role ${args.role} was revoked from ${args.account} by ${args.sender}`,
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
    },
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: 'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
        alertId: 'STMATIC-CONTRACT-ROLE-ADMIN-CHANGED',
        name: 'stMATIC: stMATIC RoleAdminChanged',
        description: (args: any) => `Admin role ${args.role} was changed form ${args.previousAdminRole} to ${args.newAdminRole}`,
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
    },
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: 'event AdminChanged(address newAdmin)',
        alertId: 'STMATIC-CONTRACT-ADMIN-CHANGED',
        name: 'stMATIC: stMATIC AdminChanged',
        description: (args: any) => `Proxy admin was changed to ${args.newAdmin}`,
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
    },
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: 'event Upgraded(address indexed implementation)',
        alertId: 'STMATIC-CONTRACT-UPGRADED',
        name: 'stMATIC: stMATIC Upgraded',
        description: (args: any) => `Implementation for stMATIC contract was changed to ${args.implementation}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
    },
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: ST_MATIC_DISTRIBUTE_REWARDS_EVENT,
        alertId: 'STMATIC-CONTRACT-REWARDS-DISTRIBUTED',
        name: 'stMATIC: stMATIC Rewards distributed',
        description: (args: any) => `Rewards for stMATIC was distributed. Rewards amount ${args._amount / MATIC_DECIMALS.toNumber()}`,
        severity: FindingSeverity.Info,
        type: FindingType.Info,
    },
    {
        address: ST_MATIC_TOKEN_ADDRESS,
        event: 'event DelegateEvent(uint256 indexed _amountDelegated, uint256 indexed _remainder)',
        alertId: 'STMATIC-CONTRACT-POOLED-MATIC-DELEGATED',
        name: 'stMATIC: stMATIC Pooled MATIC delegated',
        description: (args: any) => `Pooled MATIC was delegated to validators. Delegated amount ${args._amountDelegated / MATIC_DECIMALS.toNumber()}. MATIC remained pooled ${args._remainder / MATIC_DECIMALS.toNumber()}`,
        severity: FindingSeverity.Info,
        type: FindingType.Info,
    },
]

// THRESHOLDS
// 3.1% MATIC of total pooled MATIC
export const MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT = 3.1;

// 1.1% MATIC of total pooled MATIC
export const MAX_BUFFERED_MATIC_DAILY_PERCENT = 1.1;

// 24 hours 10 min
export const MAX_REWARDS_DISTRIBUTION_INTERVAL = 24 * 60 * 60 + 10 * 60

// report if curents rewards are less than 95% of previous rewards
export const MAX_REWARDS_DECREASE = 5