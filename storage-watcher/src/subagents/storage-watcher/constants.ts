import { ContractStorageMap } from "src/common/constants";

// Addresses and events

export const LIDO_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
export const NOR_ADDRESS = "0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5";
export const LEGACY_ORACLE_ADDRESS =
  "0x442af784A788A5bd6F42A01Ebe9F287a871243fb";
export const DEPOSIT_SECURITY_MODULE =
  "0xC77F8768774E1c9244BEed705C4354f2113CFc09";
export const WSTETH_ADDRESS = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
export const MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS =
  "0xF95f069F9AD107938F6ba802a3da87892298610E";
export const ARAGON_VOTING_ADDRESS =
  "0x2e59A20f205bB85a89C53f1936454680651E618e";
export const ARAGON_TOKEN_MANAGER_ADDRESS =
  "0xf73a1260d222f447210581ddf212d915c09a3249";
export const ARAGON_FINANCE_ADDRESS =
  "0xb9e5cbb9ca5b0d659238807e84d0176930753d86";
export const LIDO_TREASURY_ADDRESS =
  "0x3e40d73eb977dc6a537af587d48316fee66e9c8c";
export const LIDO_INSURANCE_ADDRESS =
  "0x8B3f33234ABD88493c0Cd28De33D583B70beDe35";
export const STAKING_ROUTER_ADDRESS =
  "0xFdDf38947aFB03C621C71b06C9C70bce73f12999";
export const WITHDRAWALS_QUEUE_ADDRESS =
  "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1";
export const BURNER_ADDRESS = "0xD15a672319Cf0352560eE76d9e89eAB0889046D3";
export const ACCOUNTING_ORACLE_ADDRESS =
  "0x852deD011285fe67063a08005c71a85690503Cee";
export const ACCOUNTING_HASH_CONSENSUS_ADDRESS =
  "0xD624B08C83bAECF0807Dd2c6880C3154a5F0B288";
export const VALIDATORS_EXIT_BUS_ORACLE_ADDRESS =
  "0x0De4Ea0184c2ad0BacA7183356Aea5B8d5Bf5c6e";
export const VALIDATORS_EXIT_BUS_HASH_CONSENSUS_ADDRESS =
  "0x7FaDB6358950c5fAA66Cb5EB8eE5147De3df355a";

// Storage slots mapping

export const STORAGE_SLOTS: ContractStorageMap[] = [
  {
    contract: {
      name: "Lido and stETH token",
      address: LIDO_ADDRESS,
    },
    slots: [
      { name: "lido.Versioned.contractVersion" },
      { name: "lido.Lido.lidoLocator" },
    ],
  },
  {
    contract: {
      name: "Node Operators Registry",
      address: NOR_ADDRESS,
    },
    slots: [
      { name: "lido.NodeOperatorsRegistry.lidoLocator" },
      { name: "lido.NodeOperatorsRegistry.stuckPenaltyDelay" },
      { name: "lido.NodeOperatorsRegistry.type" },
    ],
  },
  {
    contract: {
      name: "Legacy Oracle",
      address: LEGACY_ORACLE_ADDRESS,
    },
    slots: [
      { name: "lido.Versioned.contractVersion" },
      { name: "lido.LidoOracle.accountingOracle" },
      { name: "lido.LidoOracle.beaconSpec" },
      { name: "lido.LidoOracle.contractVersion" },
      { name: "lido.LidoOracle.lido" },
    ],
  },
  {
    contract: {
      name: "Accounting Oracle",
      address: ACCOUNTING_ORACLE_ADDRESS,
    },
    slots: [
      { name: "lido.Versioned.contractVersion" },
      { name: "lido.BaseOracle.consensusContract" },
      { name: "lido.BaseOracle.consensusVersion" },
    ],
  },
  {
    contract: {
      name: "Accounting Hash Consensus",
      address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    },
    slots: [
      { name: "_frameConfig", address: "0x0" },
      { name: "_memberAddresses", address: "0x2", isArray: true },
      { name: "_quorum", address: "0x5" },
      { name: "_reportProcessor", address: "0x8" },
    ],
  },
  {
    contract: {
      name: "Validators Exit Bus Oracle",
      address: VALIDATORS_EXIT_BUS_ORACLE_ADDRESS,
    },
    slots: [
      { name: "lido.Versioned.contractVersion" },
      { name: "lido.BaseOracle.consensusContract" },
      { name: "lido.BaseOracle.consensusVersion" },
    ],
  },
  {
    contract: {
      name: "Validators Exit Bus Hash Consensus",
      address: VALIDATORS_EXIT_BUS_HASH_CONSENSUS_ADDRESS,
    },
    slots: [
      { name: "_frameConfig", address: "0x0" },
      { name: "_memberAddresses", address: "0x2", isArray: true },
      { name: "_quorum", address: "0x5" },
      { name: "_reportProcessor", address: "0x8" },
    ],
  },
  {
    contract: {
      name: "Deposit Security Module",
      address: DEPOSIT_SECURITY_MODULE,
    },
    slots: [
      { name: "maxDepositsPerBlock", address: "0x0" },
      { name: "minDepositBlockDistance", address: "0x1" },
      { name: "pauseIntentValidityPeriodBlocks", address: "0x2" },
      { name: "owner", address: "0x3" },
      { name: "quorum", address: "0x4" },
      { name: "guardians", address: "0x5", isArray: true },
    ],
  },
  {
    contract: {
      name: "wstETH",
      address: WSTETH_ADDRESS,
    },
    slots: [{ name: "stETH", address: "0x7" }],
  },
  {
    contract: {
      name: "MEV Boost Relay Allowed List",
      address: MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
    },
    slots: [
      // vyper -f layout contracts/MEVBoostRelayAllowedList.vy | jq
      { name: "owner", address: "0x0" },
      { name: "manager", address: "0x1" },
      { name: "allowed_list_version", address: "0xfa3" },
    ],
  },
  {
    contract: {
      name: "Aragon Voting",
      address: ARAGON_VOTING_ADDRESS,
    },
    slots: [
      { name: "token", address: "0x0" },
      {
        name: "supportRequiredPct, minAcceptQuorumPct, voteTime",
        address: "0x1",
      },
      { name: "objectionPhaseTime", address: "0x4" },
    ],
  },
  {
    contract: {
      name: "Aragon Token Manager",
      address: ARAGON_TOKEN_MANAGER_ADDRESS,
    },
    slots: [
      { name: "token", address: "0x0" },
      { name: "maxAccountTokens", address: "0x1" },
    ],
  },
  {
    contract: {
      name: "Aragon Finance",
      address: ARAGON_FINANCE_ADDRESS,
    },
    slots: [{ name: "vault", address: "0x0" }],
  },
  {
    contract: {
      name: "Lido Treasury",
      address: LIDO_TREASURY_ADDRESS,
    },
    slots: [{ name: "designatedSigner", address: "0x1" }],
  },
  {
    contract: {
      name: "Lido Insurance",
      address: LIDO_INSURANCE_ADDRESS,
    },
    slots: [{ name: "_owner", address: "0x0" }],
  },
  {
    contract: {
      name: "Staking Router",
      address: STAKING_ROUTER_ADDRESS,
    },
    slots: [
      { name: "lido.Versioned.contractVersion" },
      { name: "lido.StakingRouter.lido" },
      { name: "lido.StakingRouter.lastStakingModuleId" },
      { name: "lido.StakingRouter.stakingModulesCount" },
      { name: "lido.StakingRouter.withdrawalCredentials" },
    ],
  },
  {
    contract: {
      name: "Withdrawals Queue",
      address: WITHDRAWALS_QUEUE_ADDRESS,
    },
    slots: [
      { name: "lido.Versioned.contractVersion" },
      { name: "lido.WithdrawalQueue.bunkerModeSinceTimestamp" },
      { name: "lido.WithdrawalQueueERC721.baseUri" },
      { name: "lido.WithdrawalQueueERC721.nftDescriptorAddress" },
    ],
  },
];
