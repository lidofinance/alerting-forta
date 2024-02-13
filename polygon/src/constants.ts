import BigNumber from "bignumber.js";

// COMMON CONSTS
export const MATIC_DECIMALS = new BigNumber(10).pow(18); // 1 MATIC
export const GRAPH_BALANCE_THRESHOLD = 1000; // 1000 GRT

// ADDRESSES AND EVENTS
export const BILLING_ADDRESS = "0x10829db618e6f520fa3a01c75bc6ddf8722fa9fe";
export const LIDO_VAULT_ADDRESS = "0x14cef290c79fc84fddfdf4129ba335972aac7f41";

export const APOLSTMATIC_ADDRES = "0xea1132120ddcdda2f119e99fa7a27a0d036f7ac9";
export const AAVE_MINT_EVENT =
  "event Mint(address indexed caller, address indexed onBehalfOf, uint256 value, uint256 balanceIncrease, uint256 index)";
export const AAVE_BURN_EVENT =
  "event Burn(address indexed from, address indexed target, uint256 value, uint256 balanceIncrease, uint256 index)";
export const AAVE_MINT_BURN_THRESHOLD = 1_000_000;

export const POOL_SIZE_CHANGE_TOLERANCE = 5;
export const CURVE_POOL_ADDRESS = "0xfb6fe7802ba9290ef8b00ca16af4bc26eb663a28";
export const BALANCER_VAULT_ADDRESS =
  "0xba12222222228d8ba445958a75a0704d566bf2c8";
export const BALANCER_POOL_ID =
  "0x8159462d255c1d24915cb51ec361f700174cd99400000000000000000000075d";

export const FORTA_DEPLOYER_ADDRESS = "0x6aea36c4a9cf8ac053c07e662fa27e8bdf047121";
export const FORT_TOKEN_ADDRESS = "0x9ff62d1fc52a907b6dcba8077c2ddca6e6a9d3e1";
export const MIN_DEPLOYER_BALANCE = 500;
