import { keccak256 } from "forta-agent";
import { ethersProvider } from "../../ethers";

export async function isContract(address: string): Promise<boolean> {
  return (await ethersProvider.getCode(address)) != "0x";
}

export const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export interface INamedRole {
  name: string;
  hash: string;
}

export function roleByName(name: string): INamedRole {
  let hash = keccak256(name);

  if (name === "DEFAULT_ADMIN_ROLE") {
    hash = DEFAULT_ADMIN_ROLE;
  }

  return {
    name: name.replace(/_/g, " "),
    hash,
  };
}
