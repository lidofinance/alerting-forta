import BigNumber from "bignumber.js";

// COMMON CONSTS
export const RUN_TIER = process.env.FORTA_AGENT_RUN_TEAR;

export const ONE_HOUR = 60 * 60;
export const ONE_WEEK = 60 * 60 * 24 * 7;
export const ONE_MONTH = ONE_WEEK * 4;

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export interface IProxyContractData {
  name: string;
  shortABI: string;
}
