import { getEthersProvider, ethers, TransactionEvent } from "forta-agent";
import { Provider } from "@ethersproject/abstract-provider";

export const ethersProvider: Provider = getEthersProvider();
export const getAddress = ethers.utils.getAddress;

export function inTx(address: string, txEvent: TransactionEvent) {
  return -1 != Object.keys(txEvent.addresses).map(getAddress).indexOf(getAddress(address));
}