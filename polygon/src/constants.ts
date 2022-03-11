import BigNumber from "bignumber.js";
import { FindingSeverity } from "forta-agent";

// COMMON CONSTS
export const MATIC_DECIMALS = new BigNumber(10 ** 18);

// 24 hours
export const FULL_24_HOURS = 24 * 60 * 60;

// ADDRESSES
export const MATIC_TOKEN_ADDRESS = "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0";
export const ST_MATIC_TOKEN_ADDRESS = "0x9ee91f9f426fa633d227f7a9b000e28b9dfd8599";
export const PROXY_ADMIN_ADDRESS = "0x0833f5bd45803e05ef54e119a77e463ce6b1a963";

export const OWNER_MULTISIG_ADDRESS = "0xd65fa54f8df43064dfd8ddf223a446fc638800a9";
export const LIDO_ON_POLYGON_PROXIES = {
  lido_nft_proxy: "0x60a91E2B7A1568f0848f3D43353C453730082E46",
  stMATIC_proxy: "0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599",
  validator_factory_proxy: "0x0a6C933495a7BB768d95f4667B074Dd5b95b78eB",
  node_operator_registry_proxy: "0x797C1369e578172112526dfcD0D5f9182067c928",
};

// EVENT ABIs
export const PROXY_ADMIN_OWNERSHIP_TRANSFERRED =
  "event OwnershipTransferred (address indexed previousOwner, address indexed newOwner)";

// THRESHOLDS
// 3.1% MATIC of total pooled MATIC
export const MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT = 3.1;

// 1.1% MATIC of total pooled MATIC
export const MAX_BUFFERED_MATIC_DAILY_PERCENT = 1.1;
