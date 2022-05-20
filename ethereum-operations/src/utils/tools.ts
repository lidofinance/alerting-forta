import { Event } from "ethers";
import { ethersProvider } from "../ethers";

export async function isContract(address: string): Promise<boolean> {
  return (await ethersProvider.getCode(address)) != "0x";
}

export const byBlockNumberDesc = (e1: Event, e2: Event) =>
  e2.blockNumber - e1.blockNumber;
