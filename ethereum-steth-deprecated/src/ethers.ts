import { ethers, getEthersProvider } from "forta-agent";
import { Provider } from "@ethersproject/abstract-provider";
import { Formatter, JsonRpcProvider } from "@ethersproject/providers";

const etherscanKey = Buffer.from(
  "SVZCSjZUSVBXWUpZSllXSVM0SVJBSlcyNjRITkFUUjZHVQ==",
  "base64",
).toString("utf-8");

class FormatterWithEIP1898 extends Formatter {
  /**
   * blockTag formatter with EIP-1898 support
   * https://eips.ethereum.org/EIPS/eip-1898
   */
  blockTag(blockTag: any): any {
    if (
      typeof blockTag === "object" &&
      blockTag != null &&
      (blockTag.blockNumber || blockTag.blockHash)
    ) {
      return blockTag;
    }

    return super.blockTag(blockTag);
  }
}

export const defaultProvider: JsonRpcProvider = getEthersProvider();
defaultProvider.formatter = new FormatterWithEIP1898();

export const ethersProvider: Provider = defaultProvider;

export const etherscanProvider = new ethers.providers.EtherscanProvider(
  process.env.FORTA_AGENT_RUN_TIER == "testnet" ? "goerli" : undefined,
  etherscanKey,
);
