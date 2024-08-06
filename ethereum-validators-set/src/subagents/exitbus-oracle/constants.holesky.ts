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
  ["0x12A1D74F8697b9f4F1eEBb0a9d0FB6a751366399", "oracle1"],
  ["0xD892c09b556b547c80B7d8c8cB8d75bf541B2284", "oracle2"],
  ["0xf7aE520e99ed3C41180B5E12681d31Aa7302E4e5", "oracle3"],
]);

export const CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID = 1;
export const SIMPLEDVT_NODE_OPERATOR_REGISTRY_MODULE_ID = 2;
export const CSM_NODE_OPERATOR_REGISTRY_MODULE_ID = 4;

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
