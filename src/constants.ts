import {
    FindingSeverity,
} from 'forta-agent'


export const ANCHOR_VAULT_ADDRESS = '0xa2f987a546d4cd1c607ee8141276876c26b72bdf'
export const ANCHOR_VAULT_REWARDS_COLLECTED_EVENT = 'event RewardsCollected(uint256 steth_amount, uint256 ust_amount)'
export const ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT = 'event SoldStethToUST(uint256 steth_amount, uint256 eth_amount, uint256 usdc_amount, uint256 ust_amount, uint256 steth_eth_price, uint256 eth_usdc_price, uint256 usdc_ust_price)'

export const LDO_TOKEN_ADDRESS = '0x5a98fcbea516cf06857215779fd812ca3bef1b32'
export const LIDO_ORACLE_ADDRESS = '0x442af784a788a5bd6f42a01ebe9f287a871243fb'
export const LIDO_ORACLE_COMPLETED_EVENT = 'event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)'

export const NODE_OPERATORS_REGISTRY_ADDRESS = "0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5"

// Report with higher than info severity if rewards have decreased more than this percentage relative to previous reports value
export const LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD = 0.5

export const EASY_TRACK_ADDRESS = '0xF0211b7660680B49De1A7E9f25C65660F0a13Fea'
export const EVM_SCRIPT_EXECUTOR_ADDRESS = '0xFE5986E06210aC1eCC1aDCafc0cc7f8D63B3F977'
export const REWARD_PROGRAMS_REGISTRY_ADDRESS = '0x3129c041b372ee93a5a8756dc4ec6f154d85bc9a'

export const EASY_TRACK_EVENTS_OF_NOTICE = [
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event Paused(address account)',
        alertId: 'EASY-TRACK-PAUSED',
        name: 'EasyTrack: EasyTrack contract was paused',
        description: (args: any) => `EasyTrack contract was paused by ${args.account}`,
        severity: FindingSeverity.High,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event Unpaused(address account)',
        alertId: 'EASY-TRACK-UNPAUSED',
        name: 'EasyTrack: EasyTrack contract was unpaused',
        description: (args: any) => `EasyTrack contract was unpaused by ${args.account}`,
        severity: FindingSeverity.High,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
        alertId: 'EASY-TRACK-ROLE-GRANTED',
        name: 'EasyTrack: Role was granted on EasyTrack contract',
        description: (args: any) => `Role ${args.role} was granted to ${args.account} on EasyTrack contract by ${args.sender}`,
        severity: FindingSeverity.High,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
        alertId: 'EASY-TRACK-ROLE-REVOKED',
        name: 'EasyTrack: Role was revoked on EasyTrack contract',
        description: (args: any) => `Role ${args.role} was revoked from ${args.account} on EasyTrack contract by ${args.sender}`,
        severity: FindingSeverity.High,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event MotionCreated(uint256 indexed motionId, address creator, address indexed evmScriptFactory, bytes evmScriptCallData, bytes evmScript)',
        alertId: 'EASY-TRACK-MOTION-CREATED',
        name: 'EasyTrack: New motion created',
        description: (args: any) => `EasyTrack new motion ${args.motionId} created by ${args.creator}`,
        severity: FindingSeverity.Info,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event MotionEnacted(uint256 indexed motionId)',
        alertId: 'EASY-TRACK-MOTION-ENACTED',
        name: 'EasyTrack: Motion executed',
        description: (args: any) => `EasyTrack motion ${args.motionId} was enacted`,
        severity: FindingSeverity.Info,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event MotionObjected(uint256 indexed motionId, address indexed objector, uint256 weight, uint256 newObjectionsAmount, uint256 newObjectionsAmountPct)',
        alertId: 'EASY-TRACK-MOTION-OBJECTED',
        name: 'EasyTrack: Motion objected',
        description: (args: any) => `EasyTrack motion ${args.motionId} was objected by ${args.objector}`,
        severity: FindingSeverity.Info,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event MotionRejected(uint256 indexed motionId)',
        alertId: 'EASY-TRACK-MOTION-REJECTED',
        name: 'EasyTrack: Motion rejected',
        description: (args: any) => `EasyTrack motion ${args.motionId} was rejected`,
        severity: FindingSeverity.Info,
    },
    
    {
        address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
        event: 'event RoleGranted (bytes32 indexed role, address indexed account, address indexed sender)',
        alertId: 'REWARD-PROGRAMS-REGISTRY-ROLE-GRANTED',
        name: 'EasyTrack: Role was granted on RewardProgramsRegistry',
        description: (args: any) => `Role ${args.role} was granted by ${args.account} on RewardProgramsRegistry by ${args.sender}`,
        severity: FindingSeverity.High,
    },
    {
        address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
        event: 'event RoleRevoked (bytes32 indexed role, address indexed account, address indexed sender)',
        alertId: 'REWARD-PROGRAMS-REGISTRY-ROLE-REVOKED',
        name: 'EasyTrack: Role was revoked on RewardProgramsRegistry',
        description: (args: any) => `Role ${args.role} was revoked from ${args.account} on RewardProgramsRegistry by ${args.sender}`,
        severity: FindingSeverity.High,
    },
    
    {
        address: EVM_SCRIPT_EXECUTOR_ADDRESS,
        event: 'EasyTrackChanged(address indexed previousEasyTrack, address indexed newEasyTrack)',
        alertId: 'EVM-SCRIPT-EXECUTOR-EASY-TRACK-CHANGED',
        name: "EasyTrack: EVMScriptExecutor's EasyTrack address changed",
        description: (args: any) => `EVMScriptExecutor's EasyTrack address changed from ${args.previousEasyTrack} to ${args.newEasyTrack}`,
        severity: FindingSeverity.High,
    },
    {
        address: EVM_SCRIPT_EXECUTOR_ADDRESS,
        event: 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
        alertId: 'EVM-SCRIPT-EXECUTOR-OWNERSHIP-TRANSFERRED',
        name: "EasyTrack: EVMScriptExecutor's ownership transferred",
        description: (args: any) => `EVMScriptExecutor's ownership transferred from ${args.previousOwner} to ${args.newOwner}`,
        severity: FindingSeverity.High,
    },
]


// trigger each 5 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 5

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_DELAY = 24 * 60 * 60 + 10 * 60 // 24h 10m

// max delay between oracle report and bETH rewards sell
export const MAX_BETH_REWARDS_SELL_DELAY = 60 * 5 // 5 minutes

// max delay of receipt of funds for Sushi rewards contract
export const MAX_SUSHI_REWARDS_RECEIPT_DELAY = 60 * 10 // 10 minutes

// max delay of receipt of funds for Sushi rewards contract
export const MIN_SUSHI_MANAGER_FUNDS_RECEIPT_MARGIN = 3 * 24 * 60 * 60 // TODO

// max deley of receipt of funds for pool rewards manager contract
export const MAX_DELAY_OF_POOL_REWARDS_PERIOD_PROLONGATION = 10 * 60 // 10 mins


// rewardsAddress is needed only if manager contract doesn't have `period_finish` function
export const POOLS_PARAMS = {
    Sushi: {
        managerAddress: '0xe5576eb1dd4aa524d67cf9a32c8742540252b6f4',
        rewardsAddress: '',
    },
    Curve: {
        managerAddress: '0x753D5167C31fBEB5b49624314d74A957Eb271709',
        rewardsAddress: '0x99ac10631F69C753DDb595D074422a0922D9056B',
    },
    Balancer: {
        managerAddress: '0x1220ccCDc9BBA5CF626a84586C74D6f940932342',
        rewardsAddress: '',
    },
    OneInch: {
        managerAddress: '0xf5436129Cf9d8fa2a1cb6e591347155276550635',
        rewardsAddress: '',
    },
}

const period10days = 10 * 24 * 60 * 60
const period5days = 5 * 24 * 60 * 60
const period3days = 3 * 24 * 60 * 60
const period2days = 2 * 24 * 60 * 60

// Must be sorted by period ascending
export const POOL_REWARDS_ALERTS_PERIODS_PARAMS = [
    {
        period: period2days,
        minManagerLdoBalance: '10000',
        description: (poolName: string) => `${poolName} rewards period expires in 2 days and LDO balance is under 10,000 LDO`,
        severity: FindingSeverity.High,
        pools: ['Sushi', 'Curve', 'Balancer', "OneInch"],
    },
    {
        period: period3days,
        minManagerLdoBalance: '0',
        description: (poolName: string) => `${poolName} rewards period expires in 3 days`,
        severity: FindingSeverity.High,
        pools: ['Sushi', 'Curve', 'Balancer', "OneInch"],
    },
    {
        period: period5days,
        minManagerLdoBalance: null,
        description: (poolName: string) => `${poolName} rewards period expires in 5 days`,
        severity: FindingSeverity.Info,
        pools: ['Sushi', 'Curve', 'Balancer', "OneInch"],
    },
    {
        period: period10days,
        minManagerLdoBalance: null,
        description: (poolName: string) => `${poolName} rewards period expires in 10 days`,
        severity: FindingSeverity.Info,
        pools: ['Sushi', 'Curve', 'Balancer', "OneInch"],
    },
]

export const MIN_AVAILABLE_KEYS_COUNT = 1000