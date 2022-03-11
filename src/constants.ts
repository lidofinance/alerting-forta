import BigNumber from 'bignumber.js'
import {
    FindingSeverity,
} from 'forta-agent'


export const ETH_DECIMALS = new BigNumber(10).pow(18)

export const ANCHOR_VAULT_ADDRESS = '0xa2f987a546d4cd1c607ee8141276876c26b72bdf'
export const ANCHOR_DEPOSIT_EVENT = 'event Deposited (address indexed sender, uint256 amount, bytes32 terra_address, uint256 beth_amount_received)'
export const ANCHOR_WITHDRAW_EVENT = 'event Withdrawn (address indexed recipient, uint256 amount, uint256 steth_amount_received)'
export const ANCHOR_VAULT_REWARDS_COLLECTED_EVENT = 'event RewardsCollected(uint256 steth_amount, uint256 ust_amount)'
export const ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT = 'event SoldStethToUST(uint256 steth_amount, uint256 eth_amount, uint256 usdc_amount, uint256 ust_amount, uint256 steth_eth_price, uint256 eth_usdc_price, uint256 usdc_ust_price)'
// 1000 stETH/bETH
export const MAX_ANCHOR_DEPOSIT_WITHDRAW_AMOUNT = new BigNumber(1000).times(ETH_DECIMALS)
// 0.51 ETH
export const MIN_REWARDS_LIQUIDATOR_ADMIN_BALANCE = new BigNumber(0.51).times(ETH_DECIMALS)
// 1 hour
export const BALANCE_REPORT_WINDOW = 60 * 60

export const AAVE_ASTETH_ADDRESS = '0x1982b2f5814301d4e9a8b0201555376e62f82428'
export const AAVE_STABLE_DEBT_STETH_ADDRESS = '0x66457616dd8489df5d0afd8678f4a260088aaf55'
export const AAVE_VARIABLE_DEBT_STETH_ADDRESS = '0xa9deac9f00dc4310c35603fcd9d34d1a750f81db'

export const LIDO_DAO_ADDRESS = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'
export const LDO_TOKEN_ADDRESS = '0x5a98fcbea516cf06857215779fd812ca3bef1b32'
export const LIDO_ORACLE_ADDRESS = '0x442af784a788a5bd6f42a01ebe9f287a871243fb'
export const LIDO_ORACLE_COMPLETED_EVENT = 'event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)'
export const LIDO_ORACLE_BEACON_REPORTED_EVENT = 'event BeaconReported(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators, address caller)'

export const LIDO_DEPOSIT_SECURITY_ADDRESS = "0xdb149235b6f40dc08810aa69869783be101790e7"
export const LIDO_DEPOSIT_EXECUTOR_ADDRESS = "0xf82ac5937a20dc862f9bc0668779031e06000f17"

export const NODE_OPERATORS_REGISTRY_ADDRESS = "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5"

export const WSTETH_TOKEN_ADDRESS = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0"
export const DAI_TOKEN_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f"

export const CHAINLINK_STETH_USD_PRICE_ADDRESS = '0xcfe54b5cd566ab89272946f602d76ea879cab4a8'

// Report with higher than info severity if rewards have decreased more than this percentage relative to previous reports value
export const LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD = 0.5

export const EASY_TRACK_ADDRESS = '0xf0211b7660680b49de1a7e9f25c65660f0a13fea'
export const EVM_SCRIPT_EXECUTOR_ADDRESS = '0xfe5986e06210ac1ecc1adcafc0cc7f8d63b3f977'
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
        event: 'event MotionCreated(uint256 indexed _motionId, address _creator, address indexed _evmScriptFactory, bytes _evmScriptCallData, bytes _evmScript)',
        alertId: 'EASY-TRACK-MOTION-CREATED',
        name: 'EasyTrack: New motion created',
        description: (args: any) => `EasyTrack new motion ${args._motionId} created by ${args._creator}`,
        severity: FindingSeverity.Info,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event MotionEnacted(uint256 indexed _motionId)',
        alertId: 'EASY-TRACK-MOTION-ENACTED',
        name: 'EasyTrack: Motion executed',
        description: (args: any) => `EasyTrack motion ${args._motionId} was enacted`,
        severity: FindingSeverity.Info,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event MotionObjected(uint256 indexed _motionId, address indexed _objector, uint256 _weight, uint256 _newObjectionsAmount, uint256 _newObjectionsAmountPct)',
        alertId: 'EASY-TRACK-MOTION-OBJECTED',
        name: 'EasyTrack: Motion objected',
        description: (args: any) => `EasyTrack motion ${args._motionId} was objected by ${args._objector}`,
        severity: FindingSeverity.Info,
    },
    {
        address: EASY_TRACK_ADDRESS,
        event: 'event MotionRejected(uint256 indexed _motionId)',
        alertId: 'EASY-TRACK-MOTION-REJECTED',
        name: 'EasyTrack: Motion rejected',
        description: (args: any) => `EasyTrack motion ${args._motionId} was rejected`,
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
        event: 'event EasyTrackChanged(address indexed _previousEasyTrack, address indexed _newEasyTrack)',
        alertId: 'EVM-SCRIPT-EXECUTOR-EASY-TRACK-CHANGED',
        name: "EasyTrack: EVMScriptExecutor's EasyTrack address changed",
        description: (args: any) => `EVMScriptExecutor's EasyTrack address changed from ${args._previousEasyTrack} to ${args._newEasyTrack}`,
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

// max delay of receipt of funds for pool rewards manager contract
export const MAX_DELAY_OF_POOL_REWARDS_PERIOD_PROLONGATION = 10 * 60 // 10 mins


// rewardsAddress is needed only if manager contract doesn't have `period_finish` function
export const POOLS_PARAMS = {
    Sushi: {
        managerAddress: '0xe5576eb1dd4aa524d67cf9a32c8742540252b6f4',
        rewardsAddress: '',
        poolContractAddress: '0xc5578194d457dcce3f272538d1ad52c68d1ce849',
        routerContractAddress: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f'
    },
    Curve: {
        managerAddress: '0x753d5167c31fbeb5b49624314d74a957eb271709',
        rewardsAddress: '0x99ac10631f69c753ddb595d074422a0922d9056b',
        poolContractAddress: '0xdc24316b9ae028f1497c275eb9192a3ea0f67022',
    },
    Balancer: {
        managerAddress: '0x1220cccdc9bba5cf626a84586c74d6f940932342',
        rewardsAddress: '',
        vaultContractAddress: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        poolId: "0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080",
    },
    OneInch: {
        managerAddress: '0xf5436129cf9d8fa2a1cb6e591347155276550635',
        rewardsAddress: '',
        poolContractAddress: '0xc1a900ae76db21dc5aa8e418ac0f4e888a4c7431',
    },
}

// threshold for price difference between LP and Chainlink feed in percents
export const PRICE_DIFFERENCE_THRESHOLD = 10

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

// 5000 ETH
export const MAX_BUFFERED_ETH_AMOUNT_CRITICAL = 5000

// 2000 ETH
export const MAX_BUFFERED_ETH_AMOUNT_MEDIUM = 2000

// 2 ETH
export const MIN_DEPOSIT_EXECUTOR_BALANCE = 2

// 72 hours
export const MAX_DEPOSITOR_TX_DELAY = 60 * 60 * 72

// 1 hour
export const MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME = 60 * 60

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18)

// 1 gwei
export const GWEI_DECIMALS = new BigNumber(10).pow(9)

// 1 gwe1
export const ASTETH_GWEI_DIFFERENCE_THRESHOLD = GWEI_DECIMALS.times(1)

// all consts in the block bellow are in percents
export const IMBALANCE_TOLERANCE = 10;
export const IMBALANCE_CHANGE_TOLERANCE = 5;
export const POOL_SIZE_CHANGE_TOLERANCE_INFO = 3;
export const POOL_SIZE_CHANGE_TOLERANCE_HIGH = 7;

//! Don't report if time passed since report moment is greater than REPORT_WINDOW
export const POOLS_BALANCES_REPORT_WINDOW = 60 * 60 * 24 * 7; // 1 week

export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO = Math.floor(60 * 60 * 24 * 7 / 13) // 1 week
export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM = Math.floor(60 * 60 * 24 * 14 / 13) // 2 weeks
export const BEACON_REPORT_QUORUM_SKIP_REPORT_WINDOW = 60 * 60 * 24 * 7; // 1 week