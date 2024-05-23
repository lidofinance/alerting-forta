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
} from 'constants/common'

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

// i.e. keccak256("APP_MANAGER_ROLE")
export const LIDO_ROLES = new Map([
  ['0xb6d92708f3d4817afc106147d969e229ced5c46e65e0a5002a0d391287762bd0', 'APP MANAGER ROLE'],
  ['0x068ca51c9d69625c7add396c98ca4f3b27d894c3b973051ad3ee53017d7094ea', 'UNSAFELY MODIFY VOTE TIME ROLE'],
  ['0xad15e7261800b4bb73f1b69d3864565ffb1fd00cb93cf14fe48da8f1f2149f39', 'MODIFY QUORUM ROLE'],
  ['0xda3972983e62bdf826c4b807c4c9c2b8a941e1f83dfa76d53d6aeac11e1be650', 'MODIFY SUPPORT ROLE'],
  ['0xe7dcd7275292e064d090fbc5f3bd7995be23b502c1fed5cd94cfddbbdcd32bbc', 'CREATE VOTES ROLE'],
  ['0x2406f1e99f79cea012fb88c5c36566feaeefee0f4b98d3a376b49310222b53c4', 'ISSUE ROLE'],
  ['0xf5a08927c847d7a29dc35e105208dbde5ce951392105d712761cc5d17440e2ff', 'ASSIGN ROLE'],
  ['0xe97b137254058bd94f28d2f3eb79e2d34074ffb488d042e3bc958e0a57d2fa22', 'BURN ROLE'],
  ['0x154c00819833dac601ee5ddded6fda79d9d8b506b911b3dbd54cdb95fe6c3686', 'MINT ROLE'],
  ['0x95ffc68daedf1eb334cfcd22ee24a5eeb5a8e58aa40679f2ad247a84140f8d6e', 'REVOKE VESTINGS ROLE'],
  ['0x5de467a460382d13defdc02aacddc9c7d6605d6d4e0b8bd2f70732cae8ea17bc', 'CREATE PAYMENTS ROLE'],
  ['0xd35e458bacdd5343c2f050f574554b2f417a8ea38d6a9a65ce2225dbe8bb9a9d', 'CHANGE PERIOD ROLE'],
  ['0xd79730e82bfef7d2f9639b9d10bf37ebb662b22ae2211502a00bdf7b2cc3a23a', 'CHANGE BUDGETS ROLE'],
  ['0x563165d3eae48bcb0a092543ca070d989169c98357e9a1b324ec5da44bab75fd', 'EXECUTE PAYMENTS ROLE'],
  ['0x30597dd103acfaef0649675953d9cb22faadab7e9d9ed57acc1c429d04b80777', 'MANAGE PAYMENTS ROLE'],
  ['0x5de467a460382d13defdc02aacddc9c7d6605d6d4e0b8bd2f70732cae8ea17bc', 'CREATE PAYMENTS ROLE'],
  ['0x6eb2a499556bfa2872f5aa15812b956cc4a71b4d64eb3553f7073c7e41415aaa', 'ADD PROTECTED TOKEN ROLE'],
  ['0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c', 'TRANSFER ROLE'],
  ['0xb421f7ad7646747f3051c50c0b8e2377839296cd4973e27f63821d73e390338f', 'RUN SCRIPT ROLE'],
  ['0x0a1ad7b87f5846153c6d5a1f761d71c7d0cfd122384f56066cd33239b7933694', 'SAFE EXECUTE ROLE'],
  ['0x71eee93d500f6f065e38b27d242a756466a00a52a1dbcd6b4260f01a8640402a', 'REMOVE PROTECTED TOKEN ROLE'],
  ['0x23ce341656c3f14df6692eebd4757791e33662b7dcf9970c8308303da5472b7c', 'DESIGNATE SIGNER ROLE'],
  ['0xcebf517aa4440d1d125e0355aae64401211d0848a23c02cc5d29a14822580ba4', 'EXECUTE ROLE'],
  ['0x0b719b33c83b8e5d300c521cb8b54ae9bd933996a14bef8c2f4e0285d2d2400a', 'CREATE PERMISSIONS ROLE'],
  ['0x1f56cfecd3595a2e6cc1a7e6cb0b20df84cdbd92eff2fee554e70e4e45a9a7d8', 'CREATE VERSION ROLE'],
  ['0xbf4b1c236312ab76e456c7a8cca624bd2f86c74a4f8e09b3a26d60b1ce492183', 'SET NODE OPERATOR ADDRESS ROLE'],
  ['0x58412970477f41493548d908d4307dfca38391d6bc001d56ffef86bd4f4a72e8', 'SET NODE OPERATOR NAME ROLE'],
  ['0xe9367af2d321a2fc8d9c8f1e67f0fc1e2adf2f9844fb89ffa212619c713685b2', 'ADD NODE OPERATOR ROLE'],
  ['0x18ad851afd4930ecc8d243c8869bd91583210624f3f1572e99ee8b450315c80f', 'REPORT STOPPED VALIDATORS ROLE'],
  ['0xd856e115ac9805c675a51831fa7d8ce01c333d666b0e34b3fc29833b7c68936a', 'SET NODE OPERATOR ACTIVE ROLE'],
  ['0x07b39e0faf2521001ae4e58cb9ffd3840a63e205d288dc9c93c3774f0d794754', 'SET NODE OPERATOR LIMIT ROLE'],
  ['0xa5ffa9f45fa52c446078e834e1914561bd9c2ab1e833572d62af775da092ccbc', 'MANAGE QUORUM'],
  ['0xe22a455f1bfbaf705ac3e891a64e156da92cb0b42cfc389158e6e82bd57f37be', 'SET BEACON REPORT RECEIVER'],
  ['0xbf6336045918ae0015f4cdb3441a2fdbfaa4bcde6558c8692aac7f56c69fb067', 'MANAGE MEMBERS'],
  ['0x16a273d48baf8111397316e6d961e6836913acb23b181e6c5fb35ec0bd2648fc', 'SET BEACON SPEC'],
  ['0x44adaee26c92733e57241cb0b26ffaa2d182ed7120ba3ecd7e0dce3635c01dc1', 'SET REPORT BOUNDARIES'],
  ['0x2fc10cc8ae19568712f7a176fb4978616a610650813c9d05326c34abb62749c7', 'RESUME ROLE'],
  ['0x84ea57490227bc2be925c684e2a367071d69890b629590198f4125a018eb1de8', 'STAKING PAUSE ROLE'],
  ['0xa42eee1333c0758ba72be38e728b6dadb32ea767de5b4ddbaea1dae85b1b051f', 'STAKING CONTROL ROLE'],
  ['0xeb7bfce47948ec1179e2358171d5ee7c821994c911519349b95313b685109031', 'MANAGE PROTOCOL CONTRACTS ROLE'],
  ['0x9d68ad53a92b6f44b2e8fb18d211bf8ccb1114f6fafd56aa364515dfdf23c44f', 'SET EL REWARDS VAULT ROLE'],
  ['0xca7d176c2da2028ed06be7e3b9457e6419ae0744dc311989e9b29f6a1ceb1003', 'SET EL REWARDS WITHDRAWAL LIMIT ROLE'],
  ['0x2561bf26f818282a3be40719542054d2173eb0d38539e8a8d3cff22f29fd2384', 'DEPOSIT ROLE'],
  ['0xbb75b874360e0bfd87f964eadd8276d8efb7c942134fc329b513032d0803e0c6', 'STAKING ROUTER ROLE'],
])

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
        [roleByName('REQUEST_BURN_SHARES_ROLE'), [ROLES_OWNERS.lido, ROLES_OWNERS.curatedNor]],
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
        [roleByName('MAX_ACCOUNTING_EXTRA_DATA_LIST_ITEMS_COUNT_ROLE'), []],
        [roleByName('MAX_NODE_OPERATORS_PER_EXTRA_DATA_ITEM_COUNT_ROLE'), []],
        [roleByName('REQUEST_TIMESTAMP_MARGIN_MANAGER_ROLE'), []],
        [roleByName('MAX_POSITIVE_TOKEN_REBASE_MANAGER_ROLE'), []],
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
        [roleByName('STAKING_MODULE_PAUSE_ROLE'), [ROLES_OWNERS.dsm]],
        [roleByName('STAKING_MODULE_RESUME_ROLE'), [ROLES_OWNERS.dsm]],
        [roleByName('STAKING_MODULE_MANAGE_ROLE'), [ROLES_OWNERS.agent]],
        [roleByName('REPORT_EXITED_VALIDATORS_ROLE'), [ROLES_OWNERS.accountingOracle]],
        [roleByName('UNSAFE_SET_EXITED_VALIDATORS_ROLE'), []],
        [roleByName('REPORT_REWARDS_MINTED_ROLE'), [ROLES_OWNERS.lido]],
      ]),
    },
  ],
])
