import config from "./config/bot-config.json";
import { ethers } from "forta-agent";

export const baseProvider = new ethers.providers.JsonRpcProvider(
  Buffer.from(config.Base.RpcUrlBase64, "base64").toString("utf-8"),
);
