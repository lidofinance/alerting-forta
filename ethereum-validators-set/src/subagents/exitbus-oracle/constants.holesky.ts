import {
  EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE as hashConsensusEvents,
  EXITBUS_ORACLE_EVENTS_OF_NOTICE as oracleEvents,
} from "./constants";

import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  WITHDRAWALS_QUEUE_ADDRESS as wqAddress,
  EXITBUS_ORACLE_ADDRESS as ebOracleAddress,
  EXITBUS_HASH_CONSENSUS_ADDRESS as ebHashAddress,
  ORACLE_REPORT_SANITY_CHECKER_ADDRESS as checkerAddress,
  WITHDRAWALS_VAULT_ADDRESS as wdVaultAddress,
  EL_REWARDS_VAULT_ADDRESS as elVaultAddress,
  STAKING_ROUTER_ADDRESS as stakingRouterAddress,
} from "../../common/constants.holesky";

export const CL_GENESIS_TIMESTAMP = 1695902400;

export const STAKING_ROUTER_ADDRESS = stakingRouterAddress;
export const EXITBUS_ORACLE_ADDRESS = ebOracleAddress;
export const EXITBUS_HASH_CONSENSUS_ADDRESS = ebHashAddress;
export const ORACLE_REPORT_SANITY_CHECKER_ADDRESS = checkerAddress;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = curatedNorAddress;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;

export const LIDO_STETH_ADDRESS = lidoStethAddress;

export const WITHDRAWALS_QUEUE_ADDRESS = wqAddress;
export const WITHDRAWALS_VAULT_ADDRESS = wdVaultAddress;
export const EL_REWARDS_VAULT_ADDRESS = elVaultAddress;

export const EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_INFO_THRESHOLD = 2;
export const EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_MEDIUM_HIGH_THRESHOLD = 4;

export const EXITBUS_ORACLE_MEMBERS = new Map<string, string>([
  ["0xf0f23944efc5a63c53632c571e7377b85d5e6b6f", "Chorus One"],
  ["0xb29dd2f6672c0dff2d2f173087739a42877a5172", "Staking Facilities"],
  ["0x31fa51343297ffce0cc1e67a50b2d3428057d1b1", "P2P Validator"],
  ["0xd3b1e36a372ca250eeff61f90e833ca070559970", "Stakefish"],
  ["0x4c75fa734a39f3a21c57e583c1c29942f021c6b7", "bloXroute"],
  ["0x81e411f1bfda43493d7994f82fb61a415f6b8fd4", "Instadapp"],
  ["0x3ff28f2ede8358e288798afc23ee299a503ad5c9", "Kyber Network"],
  ["0xf7ae520e99ed3c41180b5e12681d31aa7302e4e5", "Chainlayer"],
  ["0x12a1d74f8697b9f4f1eebb0a9d0fB6a751366399", "Lido"],
  ["0xd892c09b556b547c80b7d8c8cb8d75bf541B2284", "Lido Valset"],
]);

export const STAKING_MODULES: {
  moduleAddress: string;
  moduleName: string;
  moduleId: number;
}[] = [
  {
    moduleAddress: CURATED_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "Curated",
    moduleId: 1,
  },
  {
    moduleAddress: SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "SimpleDVT",
    moduleId: 2,
  },
];

export const EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE = hashConsensusEvents.map(
  (event) => ({
    ...event,
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
  }),
);

export const EXITBUS_ORACLE_EVENTS_OF_NOTICE = oracleEvents.map((event) => ({
  ...event,
  address: EXITBUS_ORACLE_ADDRESS,
}));
