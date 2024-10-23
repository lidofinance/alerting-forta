import { keccak256 } from 'forta-agent'
import { INamedRole, roleByName } from '../../string'

import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  ACCOUNTING_HASH_CONSENSUS_ADDRESS as accountingHashConsensusAddress,
  LIDO_LOCATOR_ADDRESS as lidoLocatorAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  ARAGON_VOTING_ADDRESS as votingAddress,
  WITHDRAWALS_QUEUE_ADDRESS as wqAddress,
  DEPOSIT_SECURITY_ADDRESS as dsAddress,
  BURNER_ADDRESS as burnerAddress,
  EVM_SCRIPT_EXECUTOR_ADDRESS as evmExecutorAddress,
  EXITBUS_ORACLE_ADDRESS as ebOracleAddress,
  EXITBUS_HASH_CONSENSUS_ADDRESS as ebHashAddress,
  ORACLE_REPORT_SANITY_CHECKER_ADDRESS as checkerAddress,
  WITHDRAWALS_VAULT_ADDRESS as wdVaultAddress,
  ORACLE_DAEMON_CONFIG_ADDRESS as oracleConfigAddress,
  GATE_SEAL_DEFAULT_ADDRESS as gsAddress,
  ARAGON_ACL_ADDRESS as aclAddress,
  LEGACY_ORACLE_ADDRESS as legacyOracleAddress,
  ARAGON_AGENT_ADDRESS as agentAddress,
  VOTING_REPO_ADDRESS as votingRepoAddress,
  LDO_PURCHASE_EXECUTOR_ADDRESS as ldoPurchaseAddress,
  APP_REPO_ADDRESS as appREpoAddress,
  ORACLE_REPO_ADDRESS as oracleRepoAddress,
  CURATED_NO_REPO_ADDRESS as curatedNoRepoAddress,
  LIDO_DAO_ADDRESS as daoAddress,
  LDO_ADDRESS as ldoAddress,
  ARAGON_TOKEN_MANAGER_ADDRESS as tmAddress,
  ARAGON_FINANCE_ADDRESS as financeAddress,
  CURVE_LIQUIDITY_FARMING_MANAGER_ADDRESS as curveManagerAddress,
  ANCHOR_VAULT_ADDRESS as anchorVaultAddress,
  EMERGENCY_BRAKES_MS_ADDRESS as emergencyMsAddress,
  DEV_MS_ADDRESS as devMsAddress,
  CS_MODULE as csmAddress,
  CS_ACCOUNTING as csmAccountingAddress,
  CS_FEE_DISTRIBUTOR as csmFeeDistributorAddress,
  CS_FEE_ORACLE as csmFeeOracleAddress,
  CS_HASH_CONSENSUS as csmHashConsensusAddress,
  CS_GATE_SEAL as csmGateSealAddress,
  CS_COMMITTEE as csmCommitteeAddress,
  CS_VERIFIER as csmVerifierAddress,
} from 'constants/common'
import { BSC_L1_CROSS_CHAIN_CONTROLLER as bscL1CrossChainControllerAddress } from '../cross-chain/mainnet'

export const NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL = 24 * 60 * 60 // 24h
export const NEW_OWNER_IS_EOA_REPORT_INTERVAL = 60 * 60 // 1h
export const NEW_ROLE_MEMBERS_REPORT_INTERVAL = 6 * 60 * 60 // 6h

export const AclEnumerableABI = [
  'function getRoleMember(bytes32, uint256) view returns (address)',
  'function getRoleMemberCount(bytes32) view returns (uint256)',
]

export const LIDO_APPS = new Map([
  [votingAddress, 'Aragon Voting'],
  [agentAddress, 'Aragon Agent'],
  [aclAddress, 'Aragon ACL'],
  [evmExecutorAddress, 'EVMScriptExecutor'],
  [dsAddress, 'Deposit Security module'],
  [curatedNorAddress, 'Node Operators Registry of Curated Module'],
  [simpleDvtNorAddress, 'Node Operators Registry of SimpleDVT Module'],
  [legacyOracleAddress, 'Legacy Oracle'],
  [lidoStethAddress, 'stETH token'],
  [srAddress, 'Staking Router'],
  [ldoPurchaseAddress, 'LDO purchase executor'],
  [votingRepoAddress, 'Voting Repo'],
  [appREpoAddress, 'Lido App Repo'],
  [oracleRepoAddress, 'Lido Oracle Repo'],
  [curatedNoRepoAddress, 'Curated Node Operators registry Repo'],
  [daoAddress, 'Lido DAO'],
  [ldoAddress, 'LDO token'],
  [tmAddress, 'Aragon Token Manager'],
  [financeAddress, 'Aragon Finance'],
])

export const ORDINARY_ENTITIES = new Map([
  [votingAddress, 'Aragon Voting'],
  [agentAddress, 'Aragon Agent'],
])

// Rewards contracts allowed owners
export const WHITELISTED_OWNERS = [
  votingAddress,
  agentAddress,
  // multisigs
  emergencyMsAddress,
  devMsAddress,
]

// This map is being used by AclChanges agent to convert role hashes to human-readable names
export const LIDO_ROLES: Partial<Record<string, string>> = {
  [keccak256('APP_MANAGER_ROLE')]: 'APP MANAGER ROLE',
  [keccak256('UNSAFELY_MODIFY_VOTE_TIME_ROLE')]: 'UNSAFELY MODIFY VOTE TIME ROLE',
  [keccak256('MODIFY_QUORUM_ROLE')]: 'MODIFY QUORUM ROLE',
  [keccak256('MODIFY_SUPPORT_ROLE')]: 'MODIFY SUPPORT ROLE',
  [keccak256('CREATE_VOTES_ROLE')]: 'CREATE VOTES ROLE',
  [keccak256('ISSUE_ROLE')]: 'ISSUE ROLE',
  [keccak256('ASSIGN_ROLE')]: 'ASSIGN ROLE',
  [keccak256('BURN_ROLE')]: 'BURN ROLE',
  [keccak256('MINT_ROLE')]: 'MINT ROLE',
  [keccak256('REVOKE_VESTINGS_ROLE')]: 'REVOKE VESTINGS ROLE',
  [keccak256('CREATE_PAYMENTS_ROLE')]: 'CREATE PAYMENTS ROLE',
  [keccak256('CHANGE_PERIOD_ROLE')]: 'CHANGE PERIOD ROLE',
  [keccak256('CHANGE_BUDGETS_ROLE')]: 'CHANGE BUDGETS ROLE',
  [keccak256('EXECUTE_PAYMENTS_ROLE')]: 'EXECUTE PAYMENTS ROLE',
  [keccak256('MANAGE_PAYMENTS_ROLE')]: 'MANAGE PAYMENTS ROLE',
  [keccak256('CREATE_PAYMENTS_ROLE')]: 'CREATE PAYMENTS ROLE',
  [keccak256('ADD_PROTECTED_TOKEN_ROLE')]: 'ADD PROTECTED TOKEN ROLE',
  [keccak256('TRANSFER_ROLE')]: 'TRANSFER ROLE',
  [keccak256('RUN_SCRIPT_ROLE')]: 'RUN SCRIPT ROLE',
  [keccak256('SAFE_EXECUTE_ROLE')]: 'SAFE EXECUTE ROLE',
  [keccak256('REMOVE_PROTECTED_TOKEN_ROLE')]: 'REMOVE PROTECTED TOKEN ROLE',
  [keccak256('DESIGNATE_SIGNER_ROLE')]: 'DESIGNATE SIGNER ROLE',
  [keccak256('EXECUTE_ROLE')]: 'EXECUTE ROLE',
  [keccak256('CREATE_PERMISSIONS_ROLE')]: 'CREATE PERMISSIONS ROLE',
  [keccak256('CREATE_VERSION_ROLE')]: 'CREATE VERSION ROLE',
  [keccak256('SET_NODE_OPERATOR_ADDRESS_ROLE')]: 'SET NODE OPERATOR ADDRESS ROLE',
  [keccak256('SET_NODE_OPERATOR_NAME_ROLE')]: 'SET NODE OPERATOR NAME ROLE',
  [keccak256('ADD_NODE_OPERATOR_ROLE')]: 'ADD NODE OPERATOR ROLE',
  [keccak256('REPORT_STOPPED_VALIDATORS_ROLE')]: 'REPORT STOPPED VALIDATORS ROLE',
  [keccak256('SET_NODE_OPERATOR_ACTIVE_ROLE')]: 'SET NODE OPERATOR ACTIVE ROLE',
  [keccak256('SET_NODE_OPERATOR_LIMIT_ROLE')]: 'SET NODE OPERATOR LIMIT ROLE',
  [keccak256('MANAGE_QUORUM')]: 'MANAGE QUORUM',
  [keccak256('SET_BEACON_REPORT_RECEIVER')]: 'SET BEACON REPORT RECEIVER',
  [keccak256('MANAGE_MEMBERS')]: 'MANAGE MEMBERS',
  [keccak256('SET_BEACON_SPEC')]: 'SET BEACON SPEC',
  [keccak256('SET_REPORT_BOUNDARIES')]: 'SET REPORT BOUNDARIES',
  [keccak256('RESUME_ROLE')]: 'RESUME ROLE',
  [keccak256('STAKING_PAUSE_ROLE')]: 'STAKING PAUSE ROLE',
  [keccak256('STAKING_CONTROL_ROLE')]: 'STAKING CONTROL ROLE',
  [keccak256('MANAGE_PROTOCOL_CONTRACTS_ROLE')]: 'MANAGE PROTOCOL CONTRACTS ROLE',
  [keccak256('SET_EL_REWARDS_VAULT_ROLE')]: 'SET EL REWARDS VAULT ROLE',
  [keccak256('SET_EL_REWARDS_WITHDRAWAL_LIMIT_ROLE')]: 'SET EL REWARDS WITHDRAWAL LIMIT ROLE',
  [keccak256('DEPOSIT_ROLE')]: 'DEPOSIT ROLE',
  [keccak256('STAKING_ROUTER_ROLE')]: 'STAKING ROUTER ROLE',
  [keccak256('MANAGE_SIGNING_KEYS')]: 'MANAGE SIGNING KEYS',
  [keccak256('STAKING_MODULE_PAUSE_ROLE')]: 'STAKING MODULE PAUSE ROLE',
  [keccak256('STAKING_MODULE_RESUME_ROLE')]: 'STAKING MODULE RESUME ROLE',
  [keccak256('STAKING_MODULE_UNVETTING_ROLE')]: 'STAKING MODULE UNVETTING ROLE',
  [keccak256('MANAGE_CONSENSUS_VERSION_ROLE')]: 'MANAGE CONSENSUS VERSION ROLE',
  [keccak256('REQUEST_BURN_SHARES_ROLE')]: 'REQUEST BURN SHARES ROLE',
  [keccak256('MANAGE_MEMBERS_AND_QUORUM_ROLE')]: 'MANAGE MEMBERS AND QUORUM ROLE',
  [keccak256('DEFAULT_ADMIN_ROLE')]: 'DEFAULT ADMIN ROLE',
  [keccak256('CONFIG_MANAGER_ROLE')]: 'CONFIG MANAGER ROLE',
  [keccak256('MANAGE_FAST_LANE_CONFIG_ROLE')]: 'MANAGE FAST LANE CONFIG ROLE',
  [keccak256('MANAGE_REPORT_PROCESSOR_ROLE')]: 'MANAGE REPORT PROCESSOR ROLE',
  [keccak256('MANAGE_FRAME_CONFIG_ROLE')]: 'MANAGE FRAME CONFIG ROLE',
  [keccak256('DISABLE_CONSENSUS_ROLE')]: 'DISABLE CONSENSUS ROLE',
  [keccak256('MANAGE_CONSENSUS_CONTRACT_ROLE')]: 'MANAGE CONSENSUS CONTRACT ROLE',
  [keccak256('SUBMIT_DATA_ROLE')]: 'SUBMIT DATA ROLE',
  [keccak256('PAUSE_ROLE')]: 'PAUSE ROLE',
  [keccak256('REQUEST_BURN_MY_STETH_ROLE')]: 'REQUEST BURN MY STETH ROLE',
  [keccak256('RECOVER_ASSETS_ROLE')]: 'RECOVER ASSETS ROLE',
  [keccak256('ALL_LIMITS_MANAGER_ROLE')]: 'ALL LIMITS MANAGER ROLE',
  [keccak256('CHURN_VALIDATORS_PER_DAY_LIMIT_MANGER_ROLE')]: 'CHURN VALIDATORS PER DAY LIMIT MANGER ROLE',
  [keccak256('ONE_OFF_CL_BALANCE_DECREASE_LIMIT_MANAGER_ROLE')]: 'ONE OFF CL BALANCE DECREASE LIMIT MANAGER ROLE',
  [keccak256('ANNUAL_BALANCE_INCREASE_LIMIT_MANAGER_ROLE')]: 'ANNUAL BALANCE INCREASE LIMIT MANAGER ROLE',
  [keccak256('SHARE_RATE_DEVIATION_LIMIT_MANAGER_ROLE')]: 'SHARE RATE DEVIATION LIMIT MANAGER ROLE',
  [keccak256('MAX_VALIDATOR_EXIT_REQUESTS_PER_REPORT_ROLE')]: 'MAX VALIDATOR EXIT REQUESTS PER REPORT ROLE',
  [keccak256('MAX_ACCOUNTING_EXTRA_DATA_LIST_ITEMS_COUNT_ROLE')]: 'MAX ACCOUNTING EXTRA DATA LIST ITEMS COUNT ROLE',
  [keccak256('MAX_NODE_OPERATORS_PER_EXTRA_DATA_ITEM_COUNT_ROLE')]: 'MAX NODE OPERATORS PER EXTRA DATA ITEM COUNT ROLE',
  [keccak256('REQUEST_TIMESTAMP_MARGIN_MANAGER_ROLE')]: 'REQUEST TIMESTAMP MARGIN MANAGER ROLE',
  [keccak256('MAX_POSITIVE_TOKEN_REBASE_MANAGER_ROLE')]: 'MAX POSITIVE TOKEN REBASE MANAGER ROLE',
  [keccak256('APPEARED_VALIDATORS_PER_DAY_LIMIT_MANAGER_ROLE')]: 'APPEARED VALIDATORS PER DAY LIMIT MANAGER ROLE',
  [keccak256('EXITED_VALIDATORS_PER_DAY_LIMIT_MANAGER_ROLE')]: 'EXITED VALIDATORS PER DAY LIMIT MANAGER ROLE',
  [keccak256('ACCOUNTING_MANAGER_ROLE')]: 'ACCOUNTING MANAGER ROLE',
  [keccak256('FINALIZE_ROLE')]: 'FINALIZE ROLE',
  [keccak256('ORACLE_ROLE')]: 'ORACLE ROLE',
  [keccak256('MANAGE_TOKEN_URI_ROLE')]: 'MANAGE TOKEN URI ROLE',
  [keccak256('MANAGE_WITHDRAWAL_CREDENTIALS_ROLE')]: 'MANAGE WITHDRAWAL CREDENTIALS ROLE',
  [keccak256('STAKING_MODULE_MANAGE_ROLE')]: 'STAKING MODULE MANAGE ROLE',
  [keccak256('REPORT_EXITED_VALIDATORS_ROLE')]: 'REPORT EXITED VALIDATORS ROLE',
  [keccak256('UNSAFE_SET_EXITED_VALIDATORS_ROLE')]: 'UNSAFE SET EXITED VALIDATORS ROLE',
  [keccak256('REPORT_REWARDS_MINTED_ROLE')]: 'REPORT REWARDS MINTED ROLE',
  [keccak256('RECOVERER_ROLE')]: 'RECOVERER ROLE',
  [keccak256('RESET_BOND_CURVE_ROLE')]: 'RESET BOND CURVE ROLE',
  [keccak256('SET_BOND_CURVE_ROLE')]: 'SET BOND CURVE ROLE',
  [keccak256('MANAGE_BOND_CURVES_ROLE')]: 'MANAGE BOND CURVES ROLE',
  [keccak256('CONTRACT_MANAGER_ROLE')]: 'CONTRACT MANAGER ROLE',
}

export interface IOwnable {
  name: string
  ownershipMethod: string
}

// List of contracts to monitor for owner
export const OWNABLE_CONTRACTS = new Map<string, IOwnable>([
  [
    dsAddress,
    {
      name: 'Deposit Security module',
      ownershipMethod: 'getOwner',
    },
  ],
  [
    curveManagerAddress,
    {
      name: 'Curve Liquidity Farming Manager',
      ownershipMethod: 'owner',
    },
  ],
  [
    '0x6140182B2536AE7B6Cfcfb2d2bAB0f6Fe0D7b58E',
    {
      name: 'ARCx Manager',
      ownershipMethod: 'owner',
    },
  ],
  [
    '0xE5576eB1dD4aA524D67Cf9a32C8742540252b6F4',
    {
      name: 'SushiSwap LP Manager',
      ownershipMethod: 'owner',
    },
  ],
  [
    '0x75ff3dd673Ef9fC459A52E1054db5dF2A1101212',
    {
      name: 'SushiSwap LP Reward',
      ownershipMethod: 'owner',
    },
  ],
  [
    '0x1220ccCDc9BBA5CF626a84586C74D6f940932342',
    {
      name: 'Balancer LP v2 Manager',
      ownershipMethod: 'owner',
    },
  ],
  [
    '0x86F6c353A0965eB069cD7f4f91C1aFEf8C725551',
    {
      name: 'Balancer LP v3 Manager',
      ownershipMethod: 'owner',
    },
  ],
  [
    '0xf5436129Cf9d8fa2a1cb6e591347155276550635',
    {
      name: '1inch LP Reward Manager',
      ownershipMethod: 'owner',
    },
  ],
  [
    anchorVaultAddress,
    {
      name: 'AnchorVault',
      ownershipMethod: 'admin',
    },
  ],
  [
    evmExecutorAddress,
    {
      name: 'Easy Track EVMScriptExecutor',
      ownershipMethod: 'owner',
    },
  ],
  [
    lidoLocatorAddress,
    {
      name: 'Lido Locator',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
  [
    srAddress,
    {
      name: 'Staking Router',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
  [
    wqAddress,
    {
      name: 'Withdrawal Queue',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
  [
    wdVaultAddress,
    {
      name: 'Withdrawal Vault',
      ownershipMethod: 'proxy_getAdmin',
    },
  ],
  [
    accountingOracleAddress,
    {
      name: 'Accounting Oracle',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
  [
    ebOracleAddress,
    {
      name: 'Validator Exit Bus Oracle',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
  [
    bscL1CrossChainControllerAddress,
    {
      name: 'EHT -> BSC cross chain controller',
      ownershipMethod: 'owner',
    },
  ],
  [
    csmAddress,
    {
      name: 'Community Staking Module',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
  [
    csmAccountingAddress,
    {
      name: 'CSM Accounting',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
  [
    csmFeeDistributorAddress,
    {
      name: 'CSM FeeDistributor',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
  [
    csmFeeOracleAddress,
    {
      name: 'CSM FeeOracle',
      ownershipMethod: 'proxy__getAdmin',
    },
  ],
])

export interface IHasRoles {
  name: string
  roles: Map<INamedRole, string[]>
}

export const ROLES_OWNERS = {
  agent: agentAddress,
  dsm: dsAddress,
  curatedNor: curatedNorAddress,
  simpleDvtNor: simpleDvtNorAddress,
  accountingOracle: accountingOracleAddress,
  lido: lidoStethAddress,
  gateSeal: gsAddress,
  stakingRouter: srAddress,
  evmExecutor: evmExecutorAddress,
  csm: csmAddress,
  csmAccounting: csmAccountingAddress,
  csmFeeDistributor: csmFeeDistributorAddress,
  csmFeeOracle: csmFeeOracleAddress,
  csmHashConsensus: csmHashConsensusAddress,
  csmGateSeal: csmGateSealAddress,
  csmCommittee: csmCommitteeAddress,
  csmVerifier: csmVerifierAddress,
}

export const ACL_ENUMERABLE_CONTRACTS = new Map<string, IHasRoles>([
  [
    oracleConfigAddress,
    {
      name: 'OracleDaemonConfig',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('CONFIG_MANAGER_ROLE'), []],
      ]),
    },
  ],
  [
    accountingHashConsensusAddress,
    {
      name: 'Accounting HashConsensus',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('MANAGE_MEMBERS_AND_QUORUM_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('MANAGE_FAST_LANE_CONFIG_ROLE'), []],
        [roleByName('MANAGE_REPORT_PROCESSOR_ROLE'), []],
        [roleByName('MANAGE_FRAME_CONFIG_ROLE'), []],
        [roleByName('DISABLE_CONSENSUS_ROLE'), []],
      ]),
    },
  ],
  [
    ebHashAddress,
    {
      name: 'Validators Exit Bus HashConsensus',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('MANAGE_MEMBERS_AND_QUORUM_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('MANAGE_FAST_LANE_CONFIG_ROLE'), []],
        [roleByName('MANAGE_REPORT_PROCESSOR_ROLE'), []],
        [roleByName('MANAGE_FRAME_CONFIG_ROLE'), []],
        [roleByName('DISABLE_CONSENSUS_ROLE'), []],
      ]),
    },
  ],
  [
    accountingOracleAddress,
    {
      name: 'Accounting Oracle',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('MANAGE_CONSENSUS_CONTRACT_ROLE'), []],
        [roleByName('MANAGE_CONSENSUS_VERSION_ROLE'), []],
        [roleByName('SUBMIT_DATA_ROLE'), []],
      ]),
    },
  ],
  [
    ebOracleAddress,
    {
      name: 'Validators Exit Bus Oracle',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('SUBMIT_DATA_ROLE'), []],
        [roleByName('PAUSE_ROLE'), [ROLES_OWNERS.gateSeal]],
        [roleByName('RESUME_ROLE'), []],
        [roleByName('MANAGE_CONSENSUS_CONTRACT_ROLE'), []],
        [roleByName('MANAGE_CONSENSUS_VERSION_ROLE'), []],
      ]),
    },
  ],
  [
    burnerAddress,
    {
      name: 'Burner',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('REQUEST_BURN_MY_STETH_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('RECOVER_ASSETS_ROLE'), []],
        [
          roleByName('REQUEST_BURN_SHARES_ROLE'),
          [ROLES_OWNERS.lido, ROLES_OWNERS.curatedNor, ROLES_OWNERS.simpleDvtNor, ROLES_OWNERS.csm],
        ],
      ]),
    },
  ],
  [
    checkerAddress,
    {
      name: 'Oracle Report Sanity Checker',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('ALL_LIMITS_MANAGER_ROLE'), []],
        [roleByName('CHURN_VALIDATORS_PER_DAY_LIMIT_MANGER_ROLE'), []],
        [roleByName('ONE_OFF_CL_BALANCE_DECREASE_LIMIT_MANAGER_ROLE'), []],
        [roleByName('ANNUAL_BALANCE_INCREASE_LIMIT_MANAGER_ROLE'), []],
        [roleByName('SHARE_RATE_DEVIATION_LIMIT_MANAGER_ROLE'), []],
        [roleByName('MAX_VALIDATOR_EXIT_REQUESTS_PER_REPORT_ROLE'), []],
        [roleByName('MAX_ACCOUNTING_EXTRA_DATA_LIST_ITEMS_COUNT_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('MAX_NODE_OPERATORS_PER_EXTRA_DATA_ITEM_COUNT_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('REQUEST_TIMESTAMP_MARGIN_MANAGER_ROLE'), []],
        [roleByName('MAX_POSITIVE_TOKEN_REBASE_MANAGER_ROLE'), []],
        [roleByName('APPEARED_VALIDATORS_PER_DAY_LIMIT_MANAGER_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('EXITED_VALIDATORS_PER_DAY_LIMIT_MANAGER_ROLE'), []],
      ]),
    },
  ],
  [
    wqAddress,
    {
      name: 'Withdrawal Queue',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('PAUSE_ROLE'), [ROLES_OWNERS.gateSeal]],
        [roleByName('RESUME_ROLE'), []],
        [roleByName('FINALIZE_ROLE'), [ROLES_OWNERS.lido]],
        [roleByName('ORACLE_ROLE'), [ROLES_OWNERS.accountingOracle]],
        [roleByName('MANAGE_TOKEN_URI_ROLE'), []],
      ]),
    },
  ],
  [
    srAddress,
    {
      name: 'Staking Router',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('MANAGE_WITHDRAWAL_CREDENTIALS_ROLE'), []],
        [roleByName('STAKING_MODULE_UNVETTING_ROLE'), [ROLES_OWNERS.dsm]],
        [roleByName('STAKING_MODULE_MANAGE_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('REPORT_EXITED_VALIDATORS_ROLE'), [ROLES_OWNERS.accountingOracle]],
        [roleByName('UNSAFE_SET_EXITED_VALIDATORS_ROLE'), []],
        [roleByName('REPORT_REWARDS_MINTED_ROLE'), [ROLES_OWNERS.lido]],
      ]),
    },
  ],
  [
    csmAddress,
    {
      name: 'Community Staking Module',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('MODULE_MANAGER_ROLE'), []],
        [roleByName('PAUSE_ROLE'), [ROLES_OWNERS.csmGateSeal]],
        [roleByName('RECOVERER_ROLE'), []],
        [roleByName('REPORT_EL_REWARDS_STEALING_PENALTY_ROLE'), [ROLES_OWNERS.csmCommittee]],
        [roleByName('RESUME_ROLE'), []],
        [roleByName('SETTLE_EL_REWARDS_STEALING_PENALTY_ROLE'), [ROLES_OWNERS.evmExecutor]],
        [roleByName('STAKING_ROUTER_ROLE'), [ROLES_OWNERS.stakingRouter]],
        [roleByName('VERIFIER_ROLE'), [ROLES_OWNERS.csmVerifier]],
      ]),
    },
  ],
  [
    csmAccountingAddress,
    {
      name: 'CSM Accounting',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('ACCOUNTING_MANAGER_ROLE'), []],
        [roleByName('MANAGE_BOND_CURVES_ROLE'), []],
        [roleByName('PAUSE_ROLE'), [ROLES_OWNERS.csmGateSeal]],
        [roleByName('RECOVERER_ROLE'), []],
        [roleByName('RESET_BOND_CURVE_ROLE'), [ROLES_OWNERS.csm, ROLES_OWNERS.csmCommittee]],
        [roleByName('RESUME_ROLE'), []],
        [roleByName('SET_BOND_CURVE_ROLE'), [ROLES_OWNERS.csm, ROLES_OWNERS.csmCommittee]],
      ]),
    },
  ],
  [
    csmFeeDistributorAddress,
    {
      name: 'CSM FeeDistributor',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('RECOVERER_ROLE'), []],
      ]),
    },
  ],
  [
    csmFeeOracleAddress,
    {
      name: 'CSM FeeOracle',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('CONTRACT_MANAGER_ROLE'), []],
        [roleByName('MANAGE_CONSENSUS_CONTRACT_ROLE'), []],
        [roleByName('MANAGE_CONSENSUS_VERSION_ROLE'), []],
        [roleByName('PAUSE_ROLE'), [ROLES_OWNERS.csmGateSeal]],
        [roleByName('RECOVERER_ROLE'), []],
        [roleByName('RESUME_ROLE'), []],
        [roleByName('SUBMIT_DATA_ROLE'), []],
      ]),
    },
  ],
  [
    csmHashConsensusAddress,
    {
      name: 'CSM HashConsensus',
      roles: new Map<INamedRole, string[]>([
        [roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('DISABLE_CONSENSUS_ROLE'), []],
        [roleByName('MANAGE_FAST_LANE_CONFIG_ROLE'), []],
        [roleByName('MANAGE_FRAME_CONFIG_ROLE'), []],
        [roleByName('MANAGE_MEMBERS_AND_QUORUM_ROLE'), []],
        [roleByName('MANAGE_REPORT_PROCESSOR_ROLE'), []],
      ]),
    },
  ],
])
