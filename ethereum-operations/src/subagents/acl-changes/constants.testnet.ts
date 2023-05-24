import { IHasRoles, IOwnable } from "./constants";
import { roleByName, INamedRole } from "./utils";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  ACCOUNTING_HASH_CONSENSUS_ADDRESS as accountingHashConsensusAddress,
  LIDO_LOCATOR_ADDRESS as lidoLocatorAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  LIDO_ARAGON_VOTING_ADDRESS as votingAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  LIDO_DEPOSIT_SECURITY_ADDRESS as dsAddress,
  LIDO_BURNER_ADDRESS as burnerAddress,
} from "../../common/constants.testnet";

export const DEV_EOAs = [
  "0xa5f1d7d49f581136cf6e58b32cbe9a2039c48ba1",
  "0x3dda46d78df19c451d12c49ef071a7e5203eed7b",
  dsAddress,
  "0x97e6f3c884117a48a4e9526d7541fd95d712e9bf",
  "0xc8a75e7196b11ae2debc39a2f8583f852e5bb7c3",
];

export const LIDO_ARAGON_ACL_ADDRESS =
  "0x9895f0f17cc1d1891b6f18ee0b483b6f221b37bb";

export const LIDO_APPS = new Map([
  ["0x1dD91b354Ebd706aB3Ac7c727455C7BAA164945A", "Lido DAO"],
  ["0x56340274fB5a72af1A3C6609061c451De7961Bd4", "LDO token"],
  [votingAddress, "Aragon Voting"],
  ["0xDfe76d11b365f5e0023343A367f0b311701B3bc1", "Aragon Token Manager"],
  ["0x75c7b1D23f1cad7Fb4D60281d7069E46440BC179", "Aragon Finance"],
  ["0x4333218072D5d7008546737786663c38B4D561A4", "Aragon Agent"],
  ["0x9895f0f17cc1d1891b6f18ee0b483b6f221b37bb", "Aragon ACL"],
  ["0xE9eDe497d2417fd980D8B5338232666641B9B9aC", "Lido App Repo"],
  ["0x9234e37Adeb44022A078557D9943b72AB89bF36a", "Lido Oracle Repo"],
  ["0x5F867429616b380f1Ca7a7283Ff18C53a0033073", "NO registry Repo"],
  ["0x14de4f901cE0B81F4EfcA594ad7b70935C276806", "Voting Repo"],
  ["0x3c9AcA237b838c59612d79198685e7f20C7fE783", "EVMScriptExecutor"],
  [dsAddress, "Deposit Security module"],
  [norAddress, "Node Operators registry"],
  ["0x24d8451BC07e7aF4Ba94F69aCDD9ad3c6579D9FB", "Legacy Oracle"],
  [lidoStethAddress, "stETH token"],
  ["0x6432756feF0fb527C06eFd4689A7CE0E195bD327", "SelfOwnedStETHBurner"],
]);

export const ORDINARY_ENTITIES = new Map([
  [votingAddress, "Aragon Voting"],
  ["0x4333218072D5d7008546737786663c38B4D561A4", "Aragon Agent"],
]);

// Rewards contracts allowed owners
export const WHITELISTED_OWNERS = [
  votingAddress,
  "0x4333218072d5d7008546737786663c38b4d561a4",
  // multisigs
  "0x73b047fe6337183a454c5217241d780a932777bd",
  "0x3cd9f71f80ab08ea5a7dca348b5e94bc595f26a0",
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
    "0xCEB67769c63cfFc6C8a6c68e85aBE1Df396B7aDA",
    {
      name: "Curve Liquidity Farming Manager",
      ownershipMethod: "owner",
    },
  ],
  [
    "0x3c9AcA237b838c59612d79198685e7f20C7fE783",
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
    "0xdc62f9e8C34be08501Cdef4EBDE0a280f576D762",
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
    "0xb75A55EFab5A8f5224Ae93B34B25741EDd3da98b",
    {
      name: "Validator Exit Bus Oracle",
      ownershipMethod: "proxy__getAdmin",
    },
  ],
]);

export const ROLES_OWNERS = {
  agent: "0x4333218072d5d7008546737786663c38b4d561a4",
  dsm: dsAddress,
  nor: norAddress,
  accountingOracle: accountingOracleAddress,
  lido: lidoStethAddress,
  gateSeal: "0x75a77ae52d88999d0b12c6e5fabb1c1ef7e92638",
};

export const ACL_ENUMERABLE_CONTRACTS = new Map<string, IHasRoles>([
  [
    "0xE9CC5bD91543cdc9788454EE5063E2CD76B5206d",
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
    "0x8374B4aC337D7e367Ea1eF54bB29880C3f036A51",
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
    "0xb75A55EFab5A8f5224Ae93B34B25741EDd3da98b",
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
          [ROLES_OWNERS.lido, ROLES_OWNERS.nor],
        ],
      ]),
    },
  ],
  [
    "0xbf74600040F91D3560d5757280727FB00c64Fd2E",
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
