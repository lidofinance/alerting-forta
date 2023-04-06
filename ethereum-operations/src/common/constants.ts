import BigNumber from "bignumber.js";

// todo: feature to rewrite constants to config (goerli, mainnet, etc.)

// COMMON CONSTS

export const ONE_HOUR = 60 * 60;
export const ONE_WEEK = 60 * 60 * 24 * 7;
export const ONE_MONTH = ONE_WEEK * 4;

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

// COMMON ADDRESSES AND EVENTS

export const EASY_TRACK_ADDRESS = "0xf0211b7660680b49de1a7e9f25c65660f0a13fea";
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";

export const MOTION_ENACTED_EVENT =
    "event MotionEnacted(uint256 indexed _motionId)";
