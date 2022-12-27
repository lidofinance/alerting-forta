import config from "./config/bot-config.json";
import { ethers } from "forta-agent";

export const polygonProvider = new ethers.providers.JsonRpcProvider(
  config.Polygon.RpcUrl
);

export const arbitrumProvider = new ethers.providers.JsonRpcProvider(
  config.Arbitrum.RpcUrl
);

export const optimismProvider = new ethers.providers.JsonRpcProvider(
  config.Optimism.RpcUrl
);

export const moonbeamProvider = new ethers.providers.JsonRpcProvider(
  config.Moonbeam.RpcUrl
);

export const moonriverProvider = new ethers.providers.JsonRpcProvider(
  config.Moonriver.RpcUrl
);
