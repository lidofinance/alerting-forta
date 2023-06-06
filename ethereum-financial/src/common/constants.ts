import BigNumber from "bignumber.js";

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);
// 1 gwei
export const GWEI_DECIMALS = new BigNumber(10).pow(9);

// 1 hour
export const ONE_HOUR = 60 * 60;

export const CHAINLINK_STETH_ETH_PAGE =
  "https://data.chain.link/ethereum/mainnet/crypto-eth/steth-eth";
