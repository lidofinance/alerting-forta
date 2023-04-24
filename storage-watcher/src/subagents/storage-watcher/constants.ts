import { ContractStorageMap } from "src/common/constants";

// Addresses and events

// NOTE: NOT A PRODUCTION-READY CONTRACTS LIST

export const LIDO_ADDRESS = "0xE5418393B2D9D36e94b7a8906Fb2e4E9dce9DEd3";
export const NOR_ADDRESS = "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";
export const LEGACY_ORACLE_ADDRESS =
  "0x442af784a788a5bd6f42a01ebe9f287a871243fb";
export const DEPOSIT_SECURITY_MODULE =
  "0x0dCa6e1cc2c3816F1c880c9861E6c2478DD0e052";
export const WSTETH_ADDRESS = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";
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
  "0xaE2D1ef2061389e106726CFD158eBd6f5DE07De5";
export const WITHDRAWALS_QUEUE_ADDRESS =
  "0xa2ECee311e61EDaf4a3ac56b437FddFaCEd8Da80";
export const BURNER_ADDRESS = "0x0359bC6ef9425414f9b22e8c9B877080B52793F5";
export const ACCOUNTING_ORACLE_ADDRESS =
  "0x010ecB2Af743c700bdfAF5dDFD55Ba3c07dcF9Df";
export const ACCOUNTING_HASH_CONSENSUS_ADDRESS =
  "0x64bc157ec2585FAc63D33a31cEd56Cee4cB421eA";
export const VALIDATORS_EXIT_BUS_ORACLE_ADDRESS =
  "0xAE5f30D1494a7B29A9a6D0D05072b6Fb092e7Ad2";
export const VALIDATORS_EXIT_BUS_HASH_CONSENSUS_ADDRESS =
  "0x8D108EB23306c9F860b1F667d9Fcdf0dA273fA89";

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
      { name: "lido.Lido.stakeLimit" },
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
      { name: "lido.LidoOracle.lastCompletedEpochId" },
      { name: "lido.LidoOracle.lido" },
      { name: "lido.LidoOracle.postCompletedTotalPooledEther" },
      { name: "lido.LidoOracle.preCompletedTotalPooledEther" },
      { name: "lido.LidoOracle.timeElapsed" },
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
  {
    contract: {
      name: "Burner",
      address: BURNER_ADDRESS,
    },
    slots: [
      { name: "coverSharesBurnRequested", address: "0x0" },
      { name: "totalCoverSharesBurnt", address: "0x2" },
    ],
  },
];
