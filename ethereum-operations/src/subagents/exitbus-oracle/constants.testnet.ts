import {
  EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE as hashConsensusEvents,
  EXITBUS_ORACLE_EVENTS_OF_NOTICE as oracleEvents,
} from "./constants";

export const CL_GENESIS_TIMESTEMP = 1616508000;

export const EXITBUS_ORACLE_ADDRESS =
  "0xb75a55efab5a8f5224ae93b34b25741edd3da98b";
export const EXITBUS_HASH_CONSENSUS_ADDRESS =
  "0x8374b4ac337d7e367ea1ef54bb29880c3f036a51";
export const ORACLE_REPORT_SANITY_CHECKER_ADDRESS =
  "0xbf74600040F91D3560d5757280727FB00c64Fd2E";
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x9d4af1ee19dad8857db3a45b0374c81c8a1c6320";

export const LIDO_ADDRESS = "0x1643e812ae58766192cf7d2cf9567df2c37e9b7f";

export const WITHDRAWALS_QUEUE_ADDRESS =
  "0xCF117961421cA9e546cD7f50bC73abCdB3039533";
export const WITHDRAWALS_VAULT_ADDRESS =
  "0xdc62f9e8C34be08501Cdef4EBDE0a280f576D762";
export const EL_REWARDS_VAULT_ADDRESS =
  "0x94750381bE1AbA0504C666ee1DB118F68f0780D4";

export const EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_INFO_THRESHOLD = 2;
export const EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_MEDIUM_HIGH_THRESHOLD = 4;

export const EXITBUS_ORACLE_MEMBERS = new Map<string, string>([
  ["0xa8af49fb44aaa8eeca9ae918bb7c05e2e71c9de9", "Chorus One"],
  ["0x1a13648ee85386cc101d2d7762e2848372068bc3", "jumpcrypto"],
  ["0xb29dd2f6672c0dff2d2f173087739a42877a5172", "Staking Facilities"],
  ["0xfda7e01b2718c511bf016030010572e833c7ae6a", "P2P Validator"],
  ["0xd3b1e36a372ca250eeff61f90e833ca070559970", "Stakefish"],
  ["0x3799bda7b884d33f79cec926af21160dc47fbe05", "Rated"],
  ["0x4c75fa734a39f3a21c57e583c1c29942f021c6b7", "bloXroute"],
  ["0x81e411f1bfda43493d7994f82fb61a415f6b8fd4", "Instadapp"],
  ["0x3ff28f2ede8358e288798afc23ee299a503ad5c9", "Kyber Network"],
]);

export const EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE = hashConsensusEvents.map(
  (event) => ({
    ...event,
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
  })
);

export const EXITBUS_ORACLE_EVENTS_OF_NOTICE = oracleEvents.map((event) => ({
  ...event,
  address: EXITBUS_ORACLE_ADDRESS,
}));
