import config from "./config/bot-config.json";
import { ethers } from "forta-agent";

export const polygonProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Polygon.RpcUrl, "base64").toString("utf-8")
);

export const arbitrumProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Arbitrum.RpcUrl, "base64").toString("utf-8")
);

export const optimismProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Optimism.RpcUrl, "base64").toString("utf-8")
);

export const moonbeamProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Moonbeam.RpcUrl, "base64").toString("utf-8")
);

export const moonriverProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Moonriver.RpcUrl, "base64").toString("utf-8")
);
