import { ethersProvider } from "../../ethers";

export async function isContract(address: string): Promise<boolean> {
  return (await ethersProvider.getCode(address)) != "0x";
}
