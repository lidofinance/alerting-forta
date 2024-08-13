import BigNumber from 'bignumber.js'
import { StorageSlot } from '../entity/storage_slot'

export type ERC20 = {
  decimals: number
  name: string
}

export type Address = {
  NOR_ADDRESS: string
  SIMPLEDVT_ADDRESS: string
  LEGACY_ORACLE_ADDRESS: string
  ACCOUNTING_ORACLE_ADDRESS: string
  ACCOUNTING_HASH_CONSENSUS_ADDRESS: string
  STAKING_ROUTER_ADDRESS: string
  MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS: string
  VEBO_ADDRESS: string
  VEBO_HASH_CONSENSUS_ADDRESS: string
  DEPOSIT_SECURITY_ADDRESS: string
  BURNER_ADDRESS: string
  LDO_ADDRESS: string
  LIDO_STETH_ADDRESS: string
  WSTETH_ADDRESS: string
  WITHDRAWALS_QUEUE_ADDRESS: string
  DEPOSIT_EXECUTOR_ADDRESS: string
  INSURANCE_FUND_ADDRESS: string
  DAI_ADDRESS: string
  USDT_ADDRESS: string
  USDC_ADDRESS: string
  GATE_SEAL_DEFAULT_ADDRESS: string
  GATE_SEAL_FACTORY_ADDRESS: string
  WITHDRAWALS_VAULT_ADDRESS: string
  EL_REWARDS_VAULT_ADDRESS: string
  ARAGON_VOTING_ADDRESS: string
  ARAGON_TOKEN_MANAGER_ADDRESS: string
  ARAGON_FINANCE_ADDRESS: string
  LIDO_TREASURY_ADDRESS: string
  LIDO_INSURANCE_ADDRESS: string
  KNOWN_ERC20: Map<string, ERC20>
}

export const ETH_DECIMALS = new BigNumber(10).pow(18)

const NOR_ADDRESS: string = '0x55032650b14df07b85bf18a3a3ec8e0af2e028d5'
const SIMPLEDVT_ADDRESS: string = '0xae7b191a31f627b4eb1d4dac64eab9976995b433'
const LEGACY_ORACLE_ADDRESS: string = '0x442af784a788a5bd6f42a01ebe9f287a871243fb'
const ACCOUNTING_ORACLE_ADDRESS: string = '0x852ded011285fe67063a08005c71a85690503cee'
const ACCOUNTING_HASH_CONSENSUS_ADDRESS: string = '0xd624b08c83baecf0807dd2c6880c3154a5f0b288'
const STAKING_ROUTER_ADDRESS: string = '0xfddf38947afb03c621c71b06c9c70bce73f12999'
const MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS: string = '0xf95f069f9ad107938f6ba802a3da87892298610e'
const DEPOSIT_SECURITY_ADDRESS: string = '0xc77f8768774e1c9244beed705c4354f2113cfc09'
const BURNER_ADDRESS: string = '0xd15a672319cf0352560ee76d9e89eab0889046d3'
const LDO_ADDRESS: string = '0x5a98fcbea516cf06857215779fd812ca3bef1b32'
const LIDO_STETH_ADDRESS: string = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'
const WSTETH_ADDRESS: string = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'
const WITHDRAWALS_QUEUE_ADDRESS: string = '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1'
const DEPOSIT_EXECUTOR_ADDRESS: string = '0xf82ac5937a20dc862f9bc0668779031e06000f17'
const INSURANCE_FUND_ADDRESS: string = '0x8b3f33234abd88493c0cd28de33d583b70bede35'
const DAI_ADDRESS: string = '0x6b175474e89094c44da98b954eedeac495271d0f'
const USDT_ADDRESS: string = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const USDC_ADDRESS: string = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const GATE_SEAL_DEFAULT_ADDRESS: string = '0x79243345eDbe01A7E42EDfF5900156700d22611c'
const VEBO_ADDRESS: string = '0x0de4ea0184c2ad0baca7183356aea5b8d5bf5c6e'
const VEBO_HASH_CONSENSUS_ADDRESS: string = '0x7fadb6358950c5faa66cb5eb8ee5147de3df355a'
const GATE_SEAL_FACTORY_ADDRESS: string = '0x6c82877cac5a7a739f16ca0a89c0a328b8764a24'
const WITHDRAWALS_VAULT_ADDRESS: string = '0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f'
const EL_REWARDS_VAULT_ADDRESS: string = '0x388c818ca8b9251b393131c08a736a67ccb19297'
const ARAGON_VOTING_ADDRESS: string = '0x2e59a20f205bb85a89c53f1936454680651e618e'
const ARAGON_TOKEN_MANAGER_ADDRESS: string = '0xf73a1260d222f447210581ddf212d915c09a3249'
const ARAGON_FINANCE_ADDRESS: string = '0xb9e5cbb9ca5b0d659238807e84d0176930753d86'
const LIDO_TREASURY_ADDRESS: string = '0x3e40d73eb977dc6a537af587d48316fee66e9c8c'
const LIDO_INSURANCE_ADDRESS: string = '0x8b3f33234abd88493c0cd28de33d583b70bede35'
// const for backward functional test capability
// https://github.com/lidofinance/alerting-forta/issues/533
export const GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024: string = '0x1ad5cb2955940f998081c1ef5f5f00875431aa90'

const KNOWN_ERC20 = new Map<string, ERC20>([
  [LIDO_STETH_ADDRESS, { decimals: 18, name: 'stETH' }],
  [WSTETH_ADDRESS, { decimals: 18, name: 'wstETH' }],
  [LDO_ADDRESS, { decimals: 18, name: 'LDO' }],
  [DAI_ADDRESS, { decimals: 18, name: 'DAI' }],
  [USDT_ADDRESS, { decimals: 6, name: 'USDT' }],
  [USDC_ADDRESS, { decimals: 6, name: 'USDC' }],
])

export const Address: Address = {
  NOR_ADDRESS: NOR_ADDRESS,
  SIMPLEDVT_ADDRESS: SIMPLEDVT_ADDRESS,
  LEGACY_ORACLE_ADDRESS: LEGACY_ORACLE_ADDRESS,
  ACCOUNTING_ORACLE_ADDRESS: ACCOUNTING_ORACLE_ADDRESS,
  ACCOUNTING_HASH_CONSENSUS_ADDRESS: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
  STAKING_ROUTER_ADDRESS: STAKING_ROUTER_ADDRESS,
  MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS: MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
  VEBO_ADDRESS: VEBO_ADDRESS,
  VEBO_HASH_CONSENSUS_ADDRESS: VEBO_HASH_CONSENSUS_ADDRESS,
  DEPOSIT_SECURITY_ADDRESS: DEPOSIT_SECURITY_ADDRESS,
  BURNER_ADDRESS: BURNER_ADDRESS,
  LDO_ADDRESS: LDO_ADDRESS,
  LIDO_STETH_ADDRESS: LIDO_STETH_ADDRESS,
  WSTETH_ADDRESS: WSTETH_ADDRESS,
  WITHDRAWALS_QUEUE_ADDRESS: WITHDRAWALS_QUEUE_ADDRESS,
  DEPOSIT_EXECUTOR_ADDRESS: DEPOSIT_EXECUTOR_ADDRESS,
  INSURANCE_FUND_ADDRESS: INSURANCE_FUND_ADDRESS,
  DAI_ADDRESS: DAI_ADDRESS,
  USDT_ADDRESS: USDT_ADDRESS,
  USDC_ADDRESS: USDC_ADDRESS,
  GATE_SEAL_DEFAULT_ADDRESS: GATE_SEAL_DEFAULT_ADDRESS,
  GATE_SEAL_FACTORY_ADDRESS: GATE_SEAL_FACTORY_ADDRESS,
  WITHDRAWALS_VAULT_ADDRESS: WITHDRAWALS_VAULT_ADDRESS,
  EL_REWARDS_VAULT_ADDRESS: EL_REWARDS_VAULT_ADDRESS,
  ARAGON_VOTING_ADDRESS: ARAGON_VOTING_ADDRESS,
  ARAGON_TOKEN_MANAGER_ADDRESS: ARAGON_TOKEN_MANAGER_ADDRESS,
  ARAGON_FINANCE_ADDRESS: ARAGON_FINANCE_ADDRESS,
  LIDO_TREASURY_ADDRESS: LIDO_TREASURY_ADDRESS,
  LIDO_INSURANCE_ADDRESS: LIDO_INSURANCE_ADDRESS,
  KNOWN_ERC20: KNOWN_ERC20,
}

export const SLOT_LIDO_VERSIONED_CONTRACT: string = 'lido.Versioned.contractVersion'
export const SLOT_LIDO_LOCATOR: string = 'lido.Lido.lidoLocator'

export const SLOT_NOR_LOCATOR: string = 'lido.NodeOperatorsRegistry.lidoLocator'
export const SLOT_NOR_STUCK_PENALTY_DELAY: string = 'lido.NodeOperatorsRegistry.stuckPenaltyDelay'
export const SLOT_NOR_TYPE: string = 'lido.NodeOperatorsRegistry.type'

export const SLOT_DVT_LOCATOR: string = 'lido.NodeOperatorsRegistry.lidoLocator'
export const SLOT_DVT_STUCK_PENALTY_DELAY: string = 'lido.NodeOperatorsRegistry.stuckPenaltyDelay'
export const SLOT_DVT_TYPE: string = 'lido.NodeOperatorsRegistry.type'

export const SLOT_LEGACY_ORACLE_VERSIONED_CONTRACT_VERSION: string = 'lido.Versioned.contractVersion'
export const SLOT_LEGACY_ORACLE_ACCOUNTING_ORACLE: string = 'lido.LidoOracle.accountingOracle'
export const SLOT_LEGACY_ORACLE_BEACON_SPEC: string = 'lido.LidoOracle.beaconSpec'
export const SLOT_LEGACY_ORACLE_CONTRACT_VERSION: string = 'lido.LidoOracle.contractVersion'
export const SLOT_LEGACY_ORACLE_LIDO: string = 'lido.LidoOracle.lido'

export const SLOT_ACCOUNTING_ORACLE_VERSIONED_CONTRACT_VERSION: string = 'lido.Versioned.contractVersion'
export const SLOT_ACCOUNTING_ORACLE_CONSENSUS_CONTRACT: string = 'lido.BaseOracle.consensusContract'
export const SLOT_ACCOUNTING_ORACLE_CONSENSUS_VERSION: string = 'lido.BaseOracle.consensusVersion'

export const SLOT_STAKING_ROUTER_VERSIONED_CONTRACT_VERSION: string = 'lido.Versioned.contractVersion'
export const SLOTS_STAKING_ROUTER_LIDO: string = 'lido.StakingRouter.lido'
export const SLOTS_STAKING_ROUTER_LAST_STAKING_MODULE_ID: string = 'lido.StakingRouter.lastStakingModuleId'
export const SLOTS_STAKING_ROUTER_STAKING_MODULES_COUNT: string = 'lido.StakingRouter.stakingModulesCount'
export const SLOTS_STAKING_ROUTER_WITHDRAWAL_CREDENTIALS: string = 'lido.StakingRouter.withdrawalCredentials'

export const SLOT_WITHDRAWALS_QUEUE_VERSIONED_CONTRACT_VERSION: string = 'lido.Versioned.contractVersion'
export const SLOT_WITHDRAWALS_QUEUE_BUNKER_MODE_SINCE_TIMESTAMP: string =
  'lido.WithdrawalQueue.bunkerModeSinceTimestamp'
export const SLOT_WITHDRAWALS_QUEUE_BASE_URI: string = 'lido.WithdrawalQueueERC721.baseUri'
export const SLOT_WITHDRAWALS_QUEUE_NFT_DESCRIPTOR_ADDRESS: string = 'lido.WithdrawalQueueERC721.nftDescriptorAddress'

export const SLOT_VEBO_VERSIONED_CONTRACT_VERSION: string = 'lido.Versioned.contractVersion'
export const SLOT_VEBO_CONSENSUS_CONTRACT: string = 'lido.BaseOracle.consensusContract'
export const SLOT_VEBO_ORACLE_CONSENSUS_VERSION: string = 'lido.BaseOracle.consensusVersion'

export const SLOT_ACCOUNTING_HASH_CONSENSUS_FRAME_CONFIG: string = '0x0'
export const SLOT_ACCOUNTING_HASH_CONSENSUS_MEMBER_ADDRESSES: string = '0x2' // array
export const SLOT_ACCOUNTING_HASH_CONSENSUS_QUORUM: string = '0x5'
export const SLOT_ACCOUNTING_HASH_CONSENSUS_REPORT_PROCESSOR: string = '0x8'

export const SLOT_VEBO_HASH_CONSENSUS_FRAME_CONFIG: string = '0x0'
export const SLOT_VEBO_HASH_CONSENSUS_MEMBER_ADDRESSES: string = '0x2' // array
export const SLOT_VEBO_HASH_CONSENSUS_QUORUM: string = '0x5'
export const SLOT_VEBO_HASH_CONSENSUS_REPORT_PROCESSOR: string = '0x8'

export const SLOT_DSM_HASH_MAX_DEPOSITS_PER_BLOCK: string = '0x0'
export const SLOT_DSM_HASH_MIN_DEPOSIT_BLOCK_DISTANCE: string = '0x1'
export const SLOT_DSM_HASH_PAUSE_INTENT_VALIDITY_PERIOD_BLOCKS: string = '0x2'
export const SLOT_DSM_OWNER: string = '0x3'
export const SLOT_DSM_QUORUM: string = '0x4'
export const SLOT_DSM_GUARDIANS: string = '0x5' // array

export const SLOT_WSTETH: string = '0x7'

export const SLOT_MEV_BOOST_OWNER: string = '0x0'
export const SLOT_MEV_BOOST_MANAGER: string = '0x1'
export const SLOT_MEV_BOOST_ALLOWED_LIST: string = '0xfa3'

export const SLOT_ARAGON_TOKEN: string = '0x0'
export const SLOT_ARAGON_SUPPORT_REQUIRED_PCT: string = '0x1'
export const SLOT_ARAGON_OBJECTION_PHASE_TIME: string = '0x4'

export const SLOT_ARAGON_MANAGER_TOKEN: string = '0x0'
export const SLOT_ARAGON_MANAGER_MAX_ACCOUNT_TOKENS: string = '0x1'

export const SLOT_ARAGON_FINANCE_VAULT: string = '0x0'

export const SLOT_LIDO_TREASURY_DESIGNATED_SIGNER: string = '0x1'
export const SLOT_LIDO_INSURANCE_OWNER: string = '0x0'

// Define constants for contact names
export const CONTACT_NAME_LIDO_STETH_TOKEN = 'Lido and stETH token'
export const CONTACT_NAME_NODE_OPERATORS_REGISTRY = 'Node Operators Registry'
export const CONTACT_NAME_SIMPLE_DVT = 'Simple DVT'
export const CONTACT_NAME_LEGACY_ORACLE = 'Legacy Oracle'
export const CONTACT_NAME_ACCOUNTING_ORACLE = 'Accounting Oracle'
export const CONTACT_NAME_ACCOUNTING_HASH_CONSENSUS = 'Accounting Hash Consensus'
export const CONTACT_NAME_VALIDATORS_EXIT_BUS_ORACLE = 'Validators Exit Bus Oracle'
export const CONTACT_NAME_VALIDATORS_EXIT_BUS_HASH_CONSENSUS = 'Validators Exit Bus Hash Consensus'
export const CONTACT_NAME_DEPOSIT_SECURITY_MODULE = 'Deposit Security Module'
export const CONTACT_NAME_WSTETH = 'wstETH'
export const CONTACT_NAME_MEV_BOOST_RELAY_ALLOWED_LIST = 'MEV Boost Relay Allowed List'
export const CONTACT_NAME_ARAGON_VOTING = 'Aragon Voting'
export const CONTACT_NAME_ARAGON_TOKEN_MANAGER = 'Aragon Token Manager'
export const CONTACT_NAME_ARAGON_FINANCE = 'Aragon Finance'
export const CONTACT_NAME_LIDO_TREASURY = 'Lido Treasury'
export const CONTACT_NAME_LIDO_INSURANCE = 'Lido Insurance'
export const CONTACT_NAME_STAKING_ROUTER = 'Staking Router'
export const CONTACT_NAME_WITHDRAWALS_QUEUE = 'Withdrawals Queue'

export const STORAGE_SLOTS: StorageSlot[] = [
  // Lido and stETH token
  {
    id: 1,
    contractAddress: LIDO_STETH_ADDRESS,
    contactName: CONTACT_NAME_LIDO_STETH_TOKEN,
    slotName: SLOT_LIDO_VERSIONED_CONTRACT,
    isAddress: false,
    isArray: false,
  },
  {
    id: 2,
    contractAddress: LIDO_STETH_ADDRESS,
    contactName: CONTACT_NAME_LIDO_STETH_TOKEN,
    slotName: SLOT_LIDO_LOCATOR,
    isAddress: false,
    isArray: false,
  },

  // Node Operators Registry
  {
    id: 3,
    contractAddress: NOR_ADDRESS,
    contactName: CONTACT_NAME_NODE_OPERATORS_REGISTRY,
    slotName: SLOT_NOR_LOCATOR,
    isAddress: false,
    isArray: false,
  },
  {
    id: 4,
    contractAddress: NOR_ADDRESS,
    contactName: CONTACT_NAME_NODE_OPERATORS_REGISTRY,
    slotName: SLOT_NOR_STUCK_PENALTY_DELAY,
    isAddress: false,
    isArray: false,
  },
  {
    id: 5,
    contractAddress: NOR_ADDRESS,
    contactName: CONTACT_NAME_NODE_OPERATORS_REGISTRY,
    slotName: SLOT_NOR_TYPE,
    isAddress: false,
    isArray: false,
  },

  // Legacy Oracle
  {
    id: 6,
    contractAddress: LEGACY_ORACLE_ADDRESS,
    contactName: CONTACT_NAME_LEGACY_ORACLE,
    slotName: SLOT_LEGACY_ORACLE_VERSIONED_CONTRACT_VERSION,
    isAddress: false,
    isArray: false,
  },
  {
    id: 7,
    contractAddress: LEGACY_ORACLE_ADDRESS,
    contactName: CONTACT_NAME_LEGACY_ORACLE,
    slotName: SLOT_LEGACY_ORACLE_ACCOUNTING_ORACLE,
    isAddress: false,
    isArray: false,
  },
  {
    id: 8,
    contractAddress: LEGACY_ORACLE_ADDRESS,
    contactName: CONTACT_NAME_LEGACY_ORACLE,
    slotName: SLOT_LEGACY_ORACLE_BEACON_SPEC,
    isAddress: false,
    isArray: false,
  },
  {
    id: 9,
    contractAddress: LEGACY_ORACLE_ADDRESS,
    contactName: CONTACT_NAME_LEGACY_ORACLE,
    slotName: SLOT_LEGACY_ORACLE_CONTRACT_VERSION,
    isAddress: false,
    isArray: false,
  },
  {
    id: 10,
    contractAddress: LEGACY_ORACLE_ADDRESS,
    contactName: CONTACT_NAME_LEGACY_ORACLE,
    slotName: SLOT_LEGACY_ORACLE_LIDO,
    isAddress: false,
    isArray: false,
  },

  // Accounting Oracle
  {
    id: 11,
    contractAddress: ACCOUNTING_ORACLE_ADDRESS,
    contactName: CONTACT_NAME_ACCOUNTING_ORACLE,
    slotName: SLOT_ACCOUNTING_ORACLE_VERSIONED_CONTRACT_VERSION,
    isAddress: false,
    isArray: false,
  },
  {
    id: 12,
    contractAddress: ACCOUNTING_ORACLE_ADDRESS,
    contactName: CONTACT_NAME_ACCOUNTING_ORACLE,
    slotName: SLOT_ACCOUNTING_ORACLE_CONSENSUS_CONTRACT,
    isAddress: false,
    isArray: false,
  },
  {
    id: 13,
    contractAddress: ACCOUNTING_ORACLE_ADDRESS,
    contactName: CONTACT_NAME_ACCOUNTING_ORACLE,
    slotName: SLOT_ACCOUNTING_ORACLE_CONSENSUS_VERSION,
    isAddress: false,
    isArray: false,
  },

  // Accounting Hash Consensus
  {
    id: 14,
    contractAddress: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    contactName: CONTACT_NAME_ACCOUNTING_HASH_CONSENSUS,
    slotName: SLOT_ACCOUNTING_HASH_CONSENSUS_FRAME_CONFIG,
    slotAddress: '0x0',
    isAddress: true,
    isArray: false,
  },
  {
    id: 15,
    contractAddress: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    contactName: CONTACT_NAME_ACCOUNTING_HASH_CONSENSUS,
    slotName: SLOT_ACCOUNTING_HASH_CONSENSUS_MEMBER_ADDRESSES,
    slotAddress: '0x2',
    isAddress: true,
    isArray: true,
  },
  {
    id: 16,
    contractAddress: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    contactName: CONTACT_NAME_ACCOUNTING_HASH_CONSENSUS,
    slotName: SLOT_ACCOUNTING_HASH_CONSENSUS_QUORUM,
    slotAddress: '0x5',
    isAddress: true,
    isArray: false,
  },
  {
    id: 17,
    contractAddress: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    contactName: CONTACT_NAME_ACCOUNTING_HASH_CONSENSUS,
    slotName: SLOT_ACCOUNTING_HASH_CONSENSUS_REPORT_PROCESSOR,
    slotAddress: '0x8',
    isAddress: true,
    isArray: false,
  },

  // Validators Exit Bus Oracle
  {
    id: 18,
    contractAddress: VEBO_ADDRESS,
    contactName: CONTACT_NAME_VALIDATORS_EXIT_BUS_ORACLE,
    slotName: SLOT_VEBO_VERSIONED_CONTRACT_VERSION,
    isAddress: false,
    isArray: false,
  },
  {
    id: 19,
    contractAddress: VEBO_ADDRESS,
    contactName: CONTACT_NAME_VALIDATORS_EXIT_BUS_ORACLE,
    slotName: SLOT_VEBO_CONSENSUS_CONTRACT,
    isAddress: false,
    isArray: false,
  },
  {
    id: 20,
    contractAddress: VEBO_ADDRESS,
    contactName: CONTACT_NAME_VALIDATORS_EXIT_BUS_ORACLE,
    slotName: SLOT_VEBO_ORACLE_CONSENSUS_VERSION,
    isAddress: false,
    isArray: false,
  },

  // Validators Exit Bus Hash Consensus
  {
    id: 21,
    contractAddress: VEBO_HASH_CONSENSUS_ADDRESS,
    contactName: CONTACT_NAME_VALIDATORS_EXIT_BUS_HASH_CONSENSUS,
    slotName: SLOT_VEBO_HASH_CONSENSUS_FRAME_CONFIG,
    slotAddress: '0x0',
    isAddress: true,
    isArray: false,
  },
  {
    id: 22,
    contractAddress: VEBO_HASH_CONSENSUS_ADDRESS,
    contactName: CONTACT_NAME_VALIDATORS_EXIT_BUS_HASH_CONSENSUS,
    slotName: SLOT_VEBO_HASH_CONSENSUS_MEMBER_ADDRESSES,
    slotAddress: '0x2',
    isAddress: true,
    isArray: true,
  },
  {
    id: 23,
    contractAddress: VEBO_HASH_CONSENSUS_ADDRESS,
    contactName: CONTACT_NAME_VALIDATORS_EXIT_BUS_HASH_CONSENSUS,
    slotName: SLOT_VEBO_HASH_CONSENSUS_QUORUM,
    slotAddress: '0x5',
    isAddress: true,
    isArray: false,
  },
  {
    id: 24,
    contractAddress: VEBO_HASH_CONSENSUS_ADDRESS,
    contactName: CONTACT_NAME_VALIDATORS_EXIT_BUS_HASH_CONSENSUS,
    slotName: SLOT_VEBO_HASH_CONSENSUS_REPORT_PROCESSOR,
    slotAddress: '0x8',
    isAddress: true,
    isArray: false,
  },

  // Deposit Security Module
  {
    id: 25,
    contractAddress: DEPOSIT_SECURITY_ADDRESS,
    contactName: CONTACT_NAME_DEPOSIT_SECURITY_MODULE,
    slotName: SLOT_DSM_HASH_MAX_DEPOSITS_PER_BLOCK,
    slotAddress: '0x0',
    isAddress: true,
    isArray: false,
  },
  {
    id: 26,
    contractAddress: DEPOSIT_SECURITY_ADDRESS,
    contactName: CONTACT_NAME_DEPOSIT_SECURITY_MODULE,
    slotName: SLOT_DSM_HASH_MIN_DEPOSIT_BLOCK_DISTANCE,
    slotAddress: '0x1',
    isAddress: true,
    isArray: false,
  },
  {
    id: 27,
    contractAddress: DEPOSIT_SECURITY_ADDRESS,
    contactName: CONTACT_NAME_DEPOSIT_SECURITY_MODULE,
    slotName: SLOT_DSM_HASH_PAUSE_INTENT_VALIDITY_PERIOD_BLOCKS,
    slotAddress: '0x2',
    isAddress: true,
    isArray: false,
  },
  {
    id: 28,
    contractAddress: DEPOSIT_SECURITY_ADDRESS,
    contactName: CONTACT_NAME_DEPOSIT_SECURITY_MODULE,
    slotName: SLOT_DSM_OWNER,
    slotAddress: '0x3',
    isAddress: true,
    isArray: false,
  },
  {
    id: 29,
    contractAddress: DEPOSIT_SECURITY_ADDRESS,
    contactName: CONTACT_NAME_DEPOSIT_SECURITY_MODULE,
    slotName: SLOT_DSM_QUORUM,
    slotAddress: '0x4',
    isAddress: true,
    isArray: false,
  },
  {
    id: 30,
    contractAddress: DEPOSIT_SECURITY_ADDRESS,
    contactName: CONTACT_NAME_DEPOSIT_SECURITY_MODULE,
    slotName: SLOT_DSM_GUARDIANS,
    slotAddress: '0x5',
    isAddress: true,
    isArray: true,
  },

  // wstETH
  {
    id: 31,
    contractAddress: WSTETH_ADDRESS,
    contactName: CONTACT_NAME_WSTETH,
    slotName: SLOT_WSTETH,
    slotAddress: '0x7',
    isAddress: true,
    isArray: false,
  },

  // MEV Boost Relay Allowed List
  {
    id: 32,
    contractAddress: MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
    contactName: CONTACT_NAME_MEV_BOOST_RELAY_ALLOWED_LIST,
    slotName: SLOT_MEV_BOOST_OWNER,
    slotAddress: '0x0',
    isAddress: true,
    isArray: false,
  },
  {
    id: 33,
    contractAddress: MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
    contactName: CONTACT_NAME_MEV_BOOST_RELAY_ALLOWED_LIST,
    slotName: SLOT_MEV_BOOST_MANAGER,
    slotAddress: '0x1',
    isAddress: true,
    isArray: false,
  },
  {
    id: 34,
    contractAddress: MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
    contactName: CONTACT_NAME_MEV_BOOST_RELAY_ALLOWED_LIST,
    slotName: SLOT_MEV_BOOST_ALLOWED_LIST,
    slotAddress: '0xfa3',
    isAddress: true,
    isArray: false,
  },
  {
    id: 35,
    contractAddress: ARAGON_VOTING_ADDRESS,
    contactName: CONTACT_NAME_ARAGON_VOTING,
    slotName: SLOT_ARAGON_TOKEN,
    slotAddress: '0x0',
    isAddress: true,
    isArray: false,
  },
  {
    id: 36,
    contractAddress: ARAGON_VOTING_ADDRESS,
    contactName: CONTACT_NAME_ARAGON_VOTING,
    slotName: SLOT_ARAGON_SUPPORT_REQUIRED_PCT,
    slotAddress: '0x1',
    isAddress: true,
    isArray: false,
  },
  {
    id: 37,
    contractAddress: ARAGON_VOTING_ADDRESS,
    contactName: CONTACT_NAME_ARAGON_VOTING,
    slotName: SLOT_ARAGON_OBJECTION_PHASE_TIME,
    slotAddress: '0x4',
    isAddress: true,
    isArray: false,
  },

  // Aragon Token Manager
  {
    id: 38,
    contractAddress: ARAGON_TOKEN_MANAGER_ADDRESS,
    contactName: CONTACT_NAME_ARAGON_TOKEN_MANAGER,
    slotName: SLOT_ARAGON_MANAGER_TOKEN,
    slotAddress: '0x0',
    isAddress: true,
    isArray: false,
  },
  {
    id: 39,
    contractAddress: ARAGON_TOKEN_MANAGER_ADDRESS,
    contactName: CONTACT_NAME_ARAGON_TOKEN_MANAGER,
    slotName: SLOT_ARAGON_MANAGER_MAX_ACCOUNT_TOKENS,
    slotAddress: '0x1',
    isAddress: true,
    isArray: false,
  },

  // Aragon Finance
  {
    id: 40,
    contractAddress: ARAGON_FINANCE_ADDRESS,
    contactName: CONTACT_NAME_ARAGON_FINANCE,
    slotName: SLOT_ARAGON_FINANCE_VAULT,
    slotAddress: '0x0',
    isAddress: true,
    isArray: false,
  },

  // Lido Treasury
  {
    id: 41,
    contractAddress: LIDO_TREASURY_ADDRESS,
    contactName: CONTACT_NAME_LIDO_TREASURY,
    slotName: SLOT_LIDO_TREASURY_DESIGNATED_SIGNER,
    slotAddress: '0x1',
    isAddress: true,
    isArray: false,
  },

  // Lido Insurance
  {
    id: 42,
    contractAddress: LIDO_INSURANCE_ADDRESS,
    contactName: CONTACT_NAME_LIDO_INSURANCE,
    slotName: SLOT_LIDO_INSURANCE_OWNER,
    slotAddress: '0x0',
    isAddress: true,
    isArray: false,
  },

  // Staking Router
  {
    id: 43,
    contractAddress: STAKING_ROUTER_ADDRESS,
    contactName: CONTACT_NAME_STAKING_ROUTER,
    slotName: SLOT_STAKING_ROUTER_VERSIONED_CONTRACT_VERSION,
    isAddress: false,
    isArray: false,
  },
  {
    id: 44,
    contractAddress: STAKING_ROUTER_ADDRESS,
    contactName: CONTACT_NAME_STAKING_ROUTER,
    slotName: SLOTS_STAKING_ROUTER_LIDO,
    isAddress: false,
    isArray: false,
  },
  {
    id: 45,
    contractAddress: STAKING_ROUTER_ADDRESS,
    contactName: CONTACT_NAME_STAKING_ROUTER,
    slotName: SLOTS_STAKING_ROUTER_LAST_STAKING_MODULE_ID,
    isAddress: false,
    isArray: false,
  },
  {
    id: 46,
    contractAddress: STAKING_ROUTER_ADDRESS,
    contactName: CONTACT_NAME_STAKING_ROUTER,
    slotName: SLOTS_STAKING_ROUTER_STAKING_MODULES_COUNT,
    isAddress: false,
    isArray: false,
  },
  {
    id: 47,
    contractAddress: STAKING_ROUTER_ADDRESS,
    contactName: CONTACT_NAME_STAKING_ROUTER,
    slotName: SLOTS_STAKING_ROUTER_WITHDRAWAL_CREDENTIALS,
    isAddress: false,
    isArray: false,
  },

  // Withdrawals Queue
  {
    id: 48,
    contractAddress: WITHDRAWALS_QUEUE_ADDRESS,
    contactName: CONTACT_NAME_WITHDRAWALS_QUEUE,
    slotName: SLOT_WITHDRAWALS_QUEUE_VERSIONED_CONTRACT_VERSION,
    isAddress: false,
    isArray: false,
  },
  {
    id: 49,
    contractAddress: WITHDRAWALS_QUEUE_ADDRESS,
    contactName: CONTACT_NAME_WITHDRAWALS_QUEUE,
    slotName: SLOT_WITHDRAWALS_QUEUE_BUNKER_MODE_SINCE_TIMESTAMP,
    isAddress: false,
    isArray: false,
  },
  {
    id: 50,
    contractAddress: WITHDRAWALS_QUEUE_ADDRESS,
    contactName: CONTACT_NAME_WITHDRAWALS_QUEUE,
    slotName: SLOT_WITHDRAWALS_QUEUE_BASE_URI,
    isAddress: false,
    isArray: false,
  },
  {
    id: 51,
    contractAddress: WITHDRAWALS_QUEUE_ADDRESS,
    contactName: CONTACT_NAME_WITHDRAWALS_QUEUE,
    slotName: SLOT_WITHDRAWALS_QUEUE_NFT_DESCRIPTOR_ADDRESS,
    isAddress: false,
    isArray: false,
  },

  // SimpleDVT
  {
    id: 52,
    contractAddress: SIMPLEDVT_ADDRESS,
    contactName: CONTACT_NAME_SIMPLE_DVT,
    slotName: SLOT_DVT_LOCATOR,
    isAddress: false,
    isArray: false,
  },
  {
    id: 53,
    contractAddress: SIMPLEDVT_ADDRESS,
    contactName: CONTACT_NAME_SIMPLE_DVT,
    slotName: SLOT_DVT_STUCK_PENALTY_DELAY,
    isAddress: false,
    isArray: false,
  },
  {
    id: 54,
    contractAddress: SIMPLEDVT_ADDRESS,
    contactName: CONTACT_NAME_SIMPLE_DVT,
    slotName: SLOT_DVT_TYPE,
    isAddress: false,
    isArray: false,
  },
]
