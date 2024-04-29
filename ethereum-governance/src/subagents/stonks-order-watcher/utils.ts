import BigNumber from "bignumber.js";

export function formatAmount(amount: any, decimals:number, dp: number = 2): string {
  return new BigNumber(String(amount)).div(new BigNumber(10).pow(decimals)).toFixed(dp);
}