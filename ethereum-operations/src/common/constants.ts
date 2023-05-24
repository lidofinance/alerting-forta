import BigNumber from "bignumber.js";

// ADDRESSES
export const ACCOUNTING_ORACLE_ADDRESS =
  "0x852ded011285fe67063a08005c71a85690503cee";
export const ACCOUNTING_HASH_CONSENSUS_ADDRESS =
  "0xd624b08c83baecf0807dd2c6880c3154a5f0b288";
export const LIDO_LOCATOR_ADDRESS =
  "0xc1d0b3de6792bf6b4b37eccdcc24e45978cfd2eb";
export const LIDO_STETH_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
export const EASY_TRACK_ADDRESS = "0xf0211b7660680b49de1a7e9f25c65660f0a13fea";
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";
export const STAKING_ROUTER_ADDRESS =
  "0xfddf38947afb03c621c71b06c9c70bce73f12999";
export const LIDO_ARAGON_VOTING_ADDRESS =
  "0x2e59a20f205bb85a89c53f1936454680651e618e";
export const WITHDRAWAL_QUEUE_ADDRESS =
  "0x889edc2edab5f40e902b864ad4d7ade8e412f9b1";
export const LIDO_DEPOSIT_SECURITY_ADDRESS =
  "0xc77f8768774e1c9244beed705c4354f2113cfc09";
export const LIDO_DEPOSIT_EXECUTOR_ADDRESS =
  "0xf82ac5937a20dc862f9bc0668779031e06000f17";
export const MEV_ALLOWED_LIST_ADDRESS =
  "0xf95f069f9ad107938f6ba802a3da87892298610e";
export const LIDO_INSURANCE_FUND_ADDRESS =
  "0x8b3f33234abd88493c0cd28de33d583b70bede35";
export const LIDO_BURNER_ADDRESS = "0xd15a672319cf0352560ee76d9e89eab0889046d3";
export const TRP_FACTORY_ADDRESS = "0xda1df6442afd2ec36abea91029794b9b2156add0";
export const ENS_BASE_REGISTRAR_ADDRESS =
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85";

// COMMON CONSTS
export const BN_ZERO = new BigNumber(0);
export const RUN_TIER = process.env.FORTA_AGENT_RUN_TIER;

export const SECONDS_PER_SLOT = 12;
export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_WEEK = 7 * ONE_DAY;
export const ONE_MONTH = ONE_WEEK * 4;
export const ONE_YEAR = 365 * ONE_DAY;

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);
// 32 ETH
export const MIN_DEPOSIT = ETH_DECIMALS.times(32);

export interface IProxyContractData {
  name: string;
  shortABI: string;
}

export interface MemberReport {
  refSlot: BigNumber;
  report: string;
  blockNumber: number;
}
