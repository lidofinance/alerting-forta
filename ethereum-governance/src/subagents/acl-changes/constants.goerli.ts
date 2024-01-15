import { IHasRoles, IOwnable } from "./constants";
import { roleByName, INamedRole } from "./utils";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  ACCOUNTING_HASH_CONSENSUS_ADDRESS as accountingHashConsensusAddress,
  LIDO_LOCATOR_ADDRESS as lidoLocatorAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
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
  APP_REPO_ADDRESS as appREpoAddress,
  ORACLE_REPO_ADDRESS as oracleRepoAddress,
  CURATED_NO_REPO_ADDRESS as noRepoAddress,
  LIDO_DAO_ADDRESS as daoAddress,
  LDO_ADDRESS as ldoAddress,
  ARAGON_TOKEN_MANAGER_ADDRESS as tmAddress,
  ARAGON_FINANCE_ADDRESS as financeAddress,
  CURVE_LIQUIDITY_FARMING_MANAGER_ADDRESS as curveManagerAddress,
  EMERGENCY_BRAKES_MS_ADDRESS as emergencyMsAddress,
  DEV_MS_ADDRESS as devMsAddress,
} from "../../common/constants.goerli";

export const DEV_EOAs = [
  "0xa5f1d7d49f581136cf6e58b32cbe9a2039c48ba1",
  "0x3dda46d78df19c451d12c49ef071a7e5203eed7b",
  dsAddress,
  "0x97e6f3c884117a48a4e9526d7541fd95d712e9bf",
  "0xc8a75e7196b11ae2debc39a2f8583f852e5bb7c3",
];

export const ARAGON_ACL_ADDRESS = aclAddress;

export const LIDO_APPS = new Map([
  [daoAddress, "Lido DAO"],
  [ldoAddress, "LDO token"],
  [votingAddress, "Aragon Voting"],
  [tmAddress, "Aragon Token Manager"],
  [financeAddress, "Aragon Finance"],
  [agentAddress, "Aragon Agent"],
  [aclAddress, "Aragon ACL"],
  [appREpoAddress, "Lido App Repo"],
  [oracleRepoAddress, "Lido Oracle Repo"],
  [noRepoAddress, "NO registry Repo"],
  [votingRepoAddress, "Voting Repo"],
  [evmExecutorAddress, "EVMScriptExecutor"],
  [dsAddress, "Deposit Security module"],
  [curatedNorAddress, "NO Registry of Curated Module"],
  [legacyOracleAddress, "Legacy Oracle"],
  [lidoStethAddress, "stETH token"],
]);

export const ORDINARY_ENTITIES = new Map([
  [votingAddress, "Aragon Voting"],
  [agentAddress, "Aragon Agent"],
]);

// Rewards contracts allowed owners
export const WHITELISTED_OWNERS = [
  votingAddress,
  agentAddress,
  // multisigs
  emergencyMsAddress,
  devMsAddress,
  // DEV
  ...DEV_EOAs,
];

// List of contracts to monitor for owner
export const OWNABLE_CONTRACTS = new Map<string, IOwnable>([
  [
    dsAddress,
    {
      name: "Deposit Security module",
      ownershipMethod: "getOwner",
    },
  ],
  [
    curveManagerAddress,
    {
      name: "Curve Liquidity Farming Manager",
      ownershipMethod: "owner",
    },
  ],
  [
    evmExecutorAddress,
    {
      name: "Easy Track EVMScriptExecutor",
      ownershipMethod: "owner",
    },
  ],
  [
    lidoLocatorAddress,
    {
      name: "Lido Locator",
      ownershipMethod: "proxy__getAdmin",
    },
  ],
  [
    srAddress,
    {
      name: "Staking Router",
      ownershipMethod: "proxy__getAdmin",
    },
  ],
  [
    wqAddress,
    {
      name: "Withdrawal Queue",
      ownershipMethod: "proxy__getAdmin",
    },
  ],
  [
    wdVaultAddress,
    {
      name: "Withdrawal Vault",
      ownershipMethod: "proxy_getAdmin",
    },
  ],
  [
    accountingOracleAddress,
    {
      name: "Accounting Oracle",
      ownershipMethod: "proxy__getAdmin",
    },
  ],
  [
    ebOracleAddress,
    {
      name: "Validator Exit Bus Oracle",
      ownershipMethod: "proxy__getAdmin",
    },
  ],
]);

export const ROLES_OWNERS = {
  agent: agentAddress,
  dsm: dsAddress,
  curatedNor: curatedNorAddress,
  accountingOracle: accountingOracleAddress,
  lido: lidoStethAddress,
  gateSeal: gsAddress,
};

export const ACL_ENUMERABLE_CONTRACTS = new Map<string, IHasRoles>([
  [
    oracleConfigAddress,
    {
      name: "OracleDaemonConfig",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("CONFIG_MANAGER_ROLE"), [DEV_EOAs[0]]],
      ]),
    },
  ],
  [
    accountingHashConsensusAddress,
    {
      name: "Accounting HashConsensus",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("MANAGE_MEMBERS_AND_QUORUM_ROLE"), [DEV_EOAs[0]]],
        [roleByName("MANAGE_FAST_LANE_CONFIG_ROLE"), []],
        [roleByName("MANAGE_REPORT_PROCESSOR_ROLE"), []],
        [roleByName("MANAGE_FRAME_CONFIG_ROLE"), [DEV_EOAs[0]]],
        [roleByName("DISABLE_CONSENSUS_ROLE"), []],
      ]),
    },
  ],
  [
    ebHashAddress,
    {
      name: "Validators Exit Bus HashConsensus",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("MANAGE_MEMBERS_AND_QUORUM_ROLE"), [DEV_EOAs[0]]],
        [roleByName("MANAGE_FAST_LANE_CONFIG_ROLE"), []],
        [roleByName("MANAGE_REPORT_PROCESSOR_ROLE"), []],
        [roleByName("MANAGE_FRAME_CONFIG_ROLE"), [DEV_EOAs[0]]],
        [roleByName("DISABLE_CONSENSUS_ROLE"), []],
      ]),
    },
  ],
  [
    accountingOracleAddress,
    {
      name: "Accounting Oracle",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("MANAGE_CONSENSUS_CONTRACT_ROLE"), []],
        [roleByName("MANAGE_CONSENSUS_VERSION_ROLE"), []],
        [roleByName("SUBMIT_DATA_ROLE"), []],
      ]),
    },
  ],
  [
    ebOracleAddress,
    {
      name: "Validators Exit Bus Oracle",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("SUBMIT_DATA_ROLE"), []],
        [roleByName("PAUSE_ROLE"), [ROLES_OWNERS.gateSeal]],
        [roleByName("RESUME_ROLE"), []],
        [roleByName("MANAGE_CONSENSUS_CONTRACT_ROLE"), []],
        [roleByName("MANAGE_CONSENSUS_VERSION_ROLE"), []],
      ]),
    },
  ],
  [
    burnerAddress,
    {
      name: "Burner",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("REQUEST_BURN_MY_STETH_ROLE"), []],
        [roleByName("RECOVER_ASSETS_ROLE"), []],
        [
          roleByName("REQUEST_BURN_SHARES_ROLE"),
          [ROLES_OWNERS.lido, ROLES_OWNERS.curatedNor],
        ],
      ]),
    },
  ],
  [
    checkerAddress,
    {
      name: "Oracle Report Sanity Checker",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("ALL_LIMITS_MANAGER_ROLE"), []],
        [roleByName("CHURN_VALIDATORS_PER_DAY_LIMIT_MANGER_ROLE"), []],
        [roleByName("ONE_OFF_CL_BALANCE_DECREASE_LIMIT_MANAGER_ROLE"), []],
        [roleByName("ANNUAL_BALANCE_INCREASE_LIMIT_MANAGER_ROLE"), []],
        [roleByName("SHARE_RATE_DEVIATION_LIMIT_MANAGER_ROLE"), []],
        [roleByName("MAX_VALIDATOR_EXIT_REQUESTS_PER_REPORT_ROLE"), []],
        [
          roleByName("MAX_ACCOUNTING_EXTRA_DATA_LIST_ITEMS_COUNT_ROLE"),
          [DEV_EOAs[0]],
        ],
        [roleByName("MAX_NODE_OPERATORS_PER_EXTRA_DATA_ITEM_COUNT_ROLE"), []],
        [roleByName("REQUEST_TIMESTAMP_MARGIN_MANAGER_ROLE"), []],
        [roleByName("MAX_POSITIVE_TOKEN_REBASE_MANAGER_ROLE"), []],
      ]),
    },
  ],
  [
    wqAddress,
    {
      name: "Withdrawal Queue",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("PAUSE_ROLE"), [ROLES_OWNERS.gateSeal]],
        [roleByName("RESUME_ROLE"), []],
        [roleByName("FINALIZE_ROLE"), [ROLES_OWNERS.lido]],
        [roleByName("ORACLE_ROLE"), [ROLES_OWNERS.accountingOracle]],
        [roleByName("MANAGE_TOKEN_URI_ROLE"), []],
      ]),
    },
  ],
  [
    srAddress,
    {
      name: "Staking Router",
      roles: new Map<INamedRole, string[]>([
        [roleByName("DEFAULT_ADMIN_ROLE"), [ROLES_OWNERS.agent]],
        [roleByName("MANAGE_WITHDRAWAL_CREDENTIALS_ROLE"), []],
        [roleByName("STAKING_MODULE_PAUSE_ROLE"), [DEV_EOAs[4], DEV_EOAs[2]]],
        [roleByName("STAKING_MODULE_RESUME_ROLE"), [ROLES_OWNERS.dsm]],
        [roleByName("STAKING_MODULE_MANAGE_ROLE"), [DEV_EOAs[3]]],
        [
          roleByName("REPORT_EXITED_VALIDATORS_ROLE"),
          [ROLES_OWNERS.accountingOracle],
        ],
        [roleByName("UNSAFE_SET_EXITED_VALIDATORS_ROLE"), []],
        [roleByName("REPORT_REWARDS_MINTED_ROLE"), [ROLES_OWNERS.lido]],
      ]),
    },
  ],
]);
