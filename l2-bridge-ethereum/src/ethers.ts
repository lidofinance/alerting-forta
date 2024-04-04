import { getEthersProvider, ethers } from "forta-agent";
import { Provider } from "@ethersproject/abstract-provider";
import { formatAddress } from "forta-agent/dist/cli/utils";

export const ethersProvider: Provider = getEthersProvider();
export const getAddress = ethers.utils.getAddress;

// The function forta uses under the hood to normalize format of addresses in TransactionEvent.addresses
export const formatAddressAsForta = formatAddress;
