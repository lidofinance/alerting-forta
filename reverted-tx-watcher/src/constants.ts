// COMMON CONSTS

// ADDRESSES AND EVENTS

export type LocatorContracts = {
  accountingOracle: string;
  depositSecurityModule: string;
  elRewardsVault: string;
  legacyOracle: string;
  lido: string;
  oracleReportSanityChecker: string;
  postTokenRebaseReceiver: string;
  burner: string;
  stakingRouter: string;
  treasury: string;
  validatorsExitBusOracle: string;
  withdrawalQueue: string;
  withdrawalVault: string;
  oracleDaemonConfig: string;
};

export const LIDO_LOCATOR_ADDRESS =
  "0xc1d0b3de6792bf6b4b37eccdcc24e45978cfd2eb"; // should be lowercase

export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";

export const MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS =
  "0xf95f069f9ad107938f6ba802a3da87892298610e";

export const ACCOUNTING_HASH_CONSENSUS_ADDRESS =
  "0xd624b08c83baecf0807dd2c6880c3154a5f0b288";

export const VALIDATORS_EXIT_BUS_HASH_CONSENSUS_ADDRESS =
  "0x7FaDB6358950c5fAA66Cb5EB8eE5147De3df355a";

export const ARAGON_VOTING_ADDRESS =
  "0x2e59A20f205bB85a89C53f1936454680651E618e";

export const GATE_SEAL_ADDRESS = "0x1ad5cb2955940f998081c1ef5f5f00875431aa90";

export const EASY_TRACK_ADDRESS = "0xf0211b7660680b49de1a7e9f25c65660f0a13fea";

export const staticContracts = {
  NodeOperatorsRegistry: NODE_OPERATORS_REGISTRY_ADDRESS,
  MevBoostRelayAllowedList: MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
  AccountingHashConsensus: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
  ValidatorsExitBusHashConsensus: VALIDATORS_EXIT_BUS_HASH_CONSENSUS_ADDRESS,
  AragonVoting: ARAGON_VOTING_ADDRESS,
  GateSeal: GATE_SEAL_ADDRESS,
  EasyTrack: EASY_TRACK_ADDRESS,
};

export const DAY = 24 * 60 * 60 * 1000;
