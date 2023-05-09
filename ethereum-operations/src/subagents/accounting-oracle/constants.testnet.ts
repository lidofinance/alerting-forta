import { ONE_DAY } from "../../common/constants";

export const ACCOUNTING_ORACLE_ADDRESS =
  "0x76f358a842defa0e179a8970767cff668fc134d6";
export const ACCOUNTING_HASH_CONSENSUS_ADDRESS =
  "0x8d87a8bcf8d4e542fd396d1c50223301c164417b";

export const ACCOUNTING_ORACLE_MEMBERS = new Map<string, string>([
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

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_SUBMIT_DELAY = ONE_DAY + 15 * 60; // 24h 15m
