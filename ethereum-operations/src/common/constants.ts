import BigNumber from "bignumber.js";

// COMMON CONSTS
export const BN_ZERO = new BigNumber(0);
export const RUN_TIER = process.env.FORTA_AGENT_RUN_TEAR;

export const SECONDS_PER_SLOT = 12;
export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_WEEK = 7 * ONE_DAY;
export const ONE_MONTH = ONE_WEEK * 4;

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export interface IProxyContractData {
  name: string;
  shortABI: string;
}

export interface MemberReport {
  refSlot: BigNumber;
  report: string;
  blockNumber: number;
}
