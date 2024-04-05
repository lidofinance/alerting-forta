import { getEthersProvider, ethers } from "forta-agent";
import { Provider } from "@ethersproject/abstract-provider";

export const ethersProvider: Provider = getEthersProvider();
export const getAddress = ethers.utils.getAddress;
