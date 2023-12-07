import config from "./config/bot-config.json";
import { ethers, getEthersProvider } from "forta-agent";
import { Provider } from "@ethersproject/abstract-provider";

export const zkSyncProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.zkSync.RpcUrlBase64, "base64").toString("utf-8"),
);

export const ethersProvider: Provider = getEthersProvider();
