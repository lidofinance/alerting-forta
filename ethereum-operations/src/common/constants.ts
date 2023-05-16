import BigNumber from "bignumber.js";

// COMMON ADDRESSES
export const LIDO_APP_REPO_ADDRESS =
  "0xF5Dc67E54FC96F993CD06073f71ca732C1E654B1";
export const LIDO_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";

export const LIDO_CONTRACT_VERSION_SET_EVENT =
  "event ContractVersionSet(uint256 version)";

// COMMON CONSTS
export const BN_ZERO = new BigNumber(0);
export const RUN_TIER = process.env.FORTA_AGENT_RUN_TEAR;

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
