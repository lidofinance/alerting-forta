import config from "./config/bot-config.json";
import { ethers } from "forta-agent";

export const polygonProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Polygon.RpcUrlBase64, "base64").toString("utf-8")
);

export const arbitrumProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Arbitrum.RpcUrlBase64, "base64").toString("utf-8")
);

export const optimismProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Optimism.RpcUrlBase64, "base64").toString("utf-8")
);
