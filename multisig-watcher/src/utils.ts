import { ethers } from "forta-agent";
import { Blockchain, BLOCKCHAIN_INFO } from "./constants";

export function etherscanAddress(
  blockchain: Blockchain,
  address: string,
  text = address
): string {
  const blockchainInfo = BLOCKCHAIN_INFO[blockchain];
  return `[${text}](${blockchainInfo.addressUrlPrefix}${address})`;
}

export const formatTokenAmount = (
  amount: ethers.BigNumber,
  decimals: number
): string => {
  const amountStr = ethers.utils.formatUnits(amount, decimals);

  const formatter = new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  return formatter.format(parseFloat(amountStr));
};
