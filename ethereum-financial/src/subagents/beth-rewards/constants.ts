import BigNumber from "bignumber.js";
import { ETH_DECIMALS } from "../../common/constants";

export const ANCHOR_VAULT_ADDRESS =
  "0xa2f987a546d4cd1c607ee8141276876c26b72bdf";
export const ANCHOR_VAULT_REWARDS_COLLECTED_EVENT =
  "event RewardsCollected(uint256 steth_amount, uint256 ust_amount)";
export const ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT =
  "event SoldStethToUST(uint256 steth_amount, uint256 eth_amount, uint256 usdc_amount, uint256 ust_amount, uint256 steth_eth_price, uint256 eth_usdc_price, uint256 usdc_ust_price)";

export const LIDO_ORACLE_ADDRESS = "0x442af784a788a5bd6f42a01ebe9f287a871243fb";
export const LIDO_ORACLE_COMPLETED_EVENT =
  "event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)";

// 0.3 ETH
export const MIN_REWARDS_LIQUIDATOR_ADMIN_BALANCE = new BigNumber(0.1).times(
  ETH_DECIMALS
);

// 4 hours
export const BALANCE_REPORT_WINDOW = 60 * 60 * 4;
