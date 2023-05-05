import BigNumber from "bignumber.js";

// COMMON ADDRESSES
export const LIDO_APP_REPO_ADDRESS =
  "0xF5Dc67E54FC96F993CD06073f71ca732C1E654B1";
export const LIDO_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";

export const LIDO_CONTRACT_VERSION_SET_EVENT = "";

// todo: consts for v1. should be removed after upgrade with old subagents
export const LIDO_APP_SEMANTIC_MAJOR_VERSION_V1 = 3;
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";
export const EASY_TRACK_ADDRESS = "0xf0211b7660680b49de1a7e9f25c65660f0a13fea";
export const MOTION_ENACTED_EVENT =
  "event MotionEnacted(uint256 indexed _motionId)";

// COMMON CONSTS
export const BN_ZERO = new BigNumber(0);
export const RUN_TIER = process.env.FORTA_AGENT_RUN_TEAR;

export const SECONDS_PER_SLOT = 12;
export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_WEEK = 7 * ONE_DAY;
export const ONE_MONTH = ONE_WEEK * 4;
export const ONE_YEAR = ONE_MONTH * 12;

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
