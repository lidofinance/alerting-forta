import { IHasRoles, IOwnable } from "./constants";
import { roleByName, INamedRole } from "./utils";

export const DEV_EOAs = [
  "0xa5f1d7d49f581136cf6e58b32cbe9a2039c48ba1",
  "0x3dda46d78df19c451d12c49ef071a7e5203eed7b",
  "0xe57025e250275ca56f92d76660decfc490c7e79a",
  "0x97e6f3c884117a48a4e9526d7541fd95d712e9bf",
  "0xc8a75e7196b11ae2debc39a2f8583f852e5bb7c3",
];

export const LIDO_ARAGON_ACL_ADDRESS =
  "0x9895f0f17cc1d1891b6f18ee0b483b6f221b37bb";

export const LIDO_APPS = new Map([
  ["0x1dD91b354Ebd706aB3Ac7c727455C7BAA164945A", "Lido DAO"],
  ["0x56340274fB5a72af1A3C6609061c451De7961Bd4", "LDO token"],
  ["0xbc0B67b4553f4CF52a913DE9A6eD0057E2E758Db", "Aragon Voting"],
  ["0xDfe76d11b365f5e0023343A367f0b311701B3bc1", "Aragon Token Manager"],
  ["0x75c7b1D23f1cad7Fb4D60281d7069E46440BC179", "Aragon Finance"],
  ["0x4333218072D5d7008546737786663c38B4D561A4", "Aragon Agent"],
  ["0x9895f0f17cc1d1891b6f18ee0b483b6f221b37bb", "Aragon ACL"],
  ["0xE9eDe497d2417fd980D8B5338232666641B9B9aC", "Lido App Repo"],
  ["0x9234e37Adeb44022A078557D9943b72AB89bF36a", "Lido Oracle Repo"],
  ["0x5F867429616b380f1Ca7a7283Ff18C53a0033073", "NO registry Repo"],
  ["0x14de4f901cE0B81F4EfcA594ad7b70935C276806", "Voting Repo"],
  ["0x3c9AcA237b838c59612d79198685e7f20C7fE783", "EVMScriptExecutor"],
  ["0xe57025E250275cA56f92d76660DEcfc490C7E79A", "Deposit Security module"],
  ["0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320", "Node Operators registry"],
  ["0x24d8451BC07e7aF4Ba94F69aCDD9ad3c6579D9FB", "Legacy Oracle"],
  ["0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F", "stETH token"],
  ["0x6432756feF0fb527C06eFd4689A7CE0E195bD327", "SelfOwnedStETHBurner"],
]);

export const ORDINARY_ENTITIES = new Map([
  ["0xbc0B67b4553f4CF52a913DE9A6eD0057E2E758Db", "Aragon Voting"],
  ["0x4333218072D5d7008546737786663c38B4D561A4", "Aragon Agent"],
]);

// Rewards contracts allowed owners
export const WHITELISTED_OWNERS = [
  "0xbc0b67b4553f4cf52a913de9a6ed0057e2e758db",
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
    "0xe57025E250275cA56f92d76660DEcfc490C7E79A",
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
    "0x1eDf09b5023DC86737b59dE68a8130De878984f5",
    {
      name: "Lido Locator",
      ownershipMethod: "proxy__getAdmin",
    },
  ],
  [
    "0xa3Dbd317E53D363176359E10948BA0b1c0A4c820",
    {
      name: "Staking Router",
      ownershipMethod: "proxy__getAdmin",
    },
  ],
  [
    "0xCF117961421cA9e546cD7f50bC73abCdB3039533",
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
    "0x76f358A842defa0E179a8970767CFf668Fc134d6",
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
  dsm: "0xe57025e250275ca56f92d76660decfc490c7e79a",
  nor: "0x9d4af1ee19dad8857db3a45b0374c81c8a1c6320",
  accountingOracle: "0x76f358a842defa0e179a8970767cff668fc134d6",
  lido: "0x1643e812ae58766192cf7d2cf9567df2c37e9b7f",
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
    "0x8d87A8BCF8d4e542fd396D1c50223301c164417b",
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
    "0x76f358A842defa0E179a8970767CFf668Fc134d6",
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
    "0x20c61C07C2E2FAb04BF5b4E12ce45a459a18f3B1",
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
    "0xCF117961421cA9e546cD7f50bC73abCdB3039533",
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
    "0xa3Dbd317E53D363176359E10948BA0b1c0A4c820",
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
