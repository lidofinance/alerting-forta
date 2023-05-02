import { ethers, getEthersProvider } from "forta-agent";
import { Provider } from "@ethersproject/abstract-provider";

const etherscanKey = Buffer.from(
  "SVZCSjZUSVBXWUpZSllXSVM0SVJBSlcyNjRITkFUUjZHVQ==",
  "base64"
).toString("utf-8");

export const ethersProvider: Provider = getEthersProvider();
export const etherscanProvider = new ethers.providers.EtherscanProvider(
  process.env.FORTA_AGENT_RUN_TEAR == "testnet" ? "goerli" : undefined,
  etherscanKey
);
