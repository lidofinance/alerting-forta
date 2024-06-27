import BigNumber from "bignumber.js";
import config from "./config/bot-config.json";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

// ADDRESSES AND EVENTS

export const WSTETH_ADDRESS = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";

export interface BridgeParamWstETH {
  name: string;
  l1Gateway: string;
  wstEthBridged: string;
  rpcUrl: string;
}

export interface BridgeParamsWstETH {
  Arbitrum: BridgeParamWstETH;
}

export const BRIDGE_PARAMS_WSTETH: BridgeParamsWstETH = {
  Arbitrum: {
    name: "Arbitrum",
    l1Gateway: "0x0f25c1dc2a9922304f2eac71dca9b07e310e8e5a",
    wstEthBridged: "0x5979d7b546e38e414f7e9822514be443a4800529",
    rpcUrl: config.Arbitrum.RpcUrl,
  },
};

export const LDO_ADDRESS = "0x5a98fcbea516cf06857215779fd812ca3bef1b32";

export interface BridgeParamLDO {
  name: string;
  l1Gateway: string;
  ldoBridged: string;
  rpcUrl: string;
}

export interface BridgeParamsLDO {
  Arbitrum: BridgeParamLDO;
}

export const BRIDGE_PARAMS_LDO: BridgeParamsLDO = {
  Arbitrum: {
    name: "Arbitrum",
    l1Gateway: "0xa3a7b6f88361f48403514059f1f16c8e78d60eec",
    ldoBridged: "0x13ad51ed4f1b7e9dc168d8a00cb3f4ddd85efa60",
    rpcUrl: config.Arbitrum.RpcUrl,
  },
};
