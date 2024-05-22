import { getEthersProvider } from "forta-agent";
import { Provider } from "@ethersproject/abstract-provider";

export const ethersProvider: Provider = getEthersProvider();
