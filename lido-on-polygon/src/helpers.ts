import { ethers } from "ethers";
import { NODE_OPERATORS_REGISTRY_ADDRESS } from "./constants";
import { ethersProvider } from "./ethers";

const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

export function abbreviateNumber(number: number): string {
  // what tier.ts? (determines SI symbol)
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;

  // if zero, we don't need a suffix
  if (tier == 0) {
    return Math.round(number).toString();
  }

  // get suffix and determine scale
  const suffix = SI_SYMBOL[tier];
  const scale = Math.pow(10, tier * 3);

  // scale the number
  const scaled = number / scale;

  // format number and add suffix
  return scaled.toFixed(1) + suffix;
}

/**
 * Get version of NodeOperatorsRegistry contract
 */
export async function getNORVersion(
  blockTag: number | string,
): Promise<string> {
  const contract = new ethers.Contract(
    NODE_OPERATORS_REGISTRY_ADDRESS,
    ["function version() view returns (string)"],
    ethersProvider,
  );

  return await contract.version({ blockTag });
}
