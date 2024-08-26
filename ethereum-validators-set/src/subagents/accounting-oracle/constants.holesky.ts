import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  ACCOUNTING_HASH_CONSENSUS_ADDRESS as accountingHashConsensusAddress,
} from "../../common/constants.goerli";
import {
  ACCOUNTING_HASH_CONSENSUS_EVENTS_OF_NOTICE as hashConsensusEvents,
  ACCOUNTING_ORACLE_EVENTS_OF_NOTICE as oracleEvents,
} from "./constants";

export const ACCOUNTING_ORACLE_ADDRESS = accountingOracleAddress;
export const ACCOUNTING_HASH_CONSENSUS_ADDRESS = accountingHashConsensusAddress;

export const ACCOUNTING_ORACLE_MEMBERS = new Map<string, string>([
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

export const ACCOUNTING_HASH_CONSENSUS_EVENTS_OF_NOTICE =
  hashConsensusEvents.map((event) => ({
    ...event,
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
  }));

export const ACCOUNTING_ORACLE_EVENTS_OF_NOTICE = oracleEvents.map((event) => ({
  ...event,
  address: ACCOUNTING_ORACLE_ADDRESS,
}));
