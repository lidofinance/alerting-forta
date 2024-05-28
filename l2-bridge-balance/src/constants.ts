import BigNumber from "bignumber.js";
import config from "./config/bot-config.json";

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
  Optimism: BridgeParamWstETH;
}

export const BRIDGE_PARAMS_WSTETH: BridgeParamsWstETH = {
  Arbitrum: {
    name: "Arbitrum",
    l1Gateway: "0x0f25c1dc2a9922304f2eac71dca9b07e310e8e5a",
    wstEthBridged: "0x5979d7b546e38e414f7e9822514be443a4800529",
    rpcUrl: config.Arbitrum.RpcUrl,
  },
  Optimism: {
    name: "Optimism",
    l1Gateway: "0x76943c0d61395d8f2edf9060e1533529cae05de6",
    wstEthBridged: "0x1f32b1c2345538c0c6f582fcb022739c4a194ebb",
    rpcUrl: config.Optimism.RpcUrl,
  },
};

export const LDO_L1_ADDRESS = "0x5a98fcbea516cf06857215779fd812ca3bef1b32";

export interface BridgeParamLDO {
  name: string;
  l1Gateway: string;
  ldoBridged: string;
  rpcUrl: string;
}

export interface BridgeParamsLDO {
  Arbitrum: BridgeParamLDO;
  Optimism: BridgeParamLDO;
}

export const BRIDGE_PARAMS_LDO: BridgeParamsLDO = {
  Arbitrum: {
    name: "Arbitrum",
    l1Gateway: "0xa3a7b6f88361f48403514059f1f16c8e78d60eec",
    ldoBridged: "0x13ad51ed4f1b7e9dc168d8a00cb3f4ddd85efa60",
    rpcUrl: config.Arbitrum.RpcUrl,
  },
  Optimism: {
    name: "Optimism",
    l1Gateway: "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1",
    ldoBridged: "0xfdb794692724153d1488ccdbe0c56c252596735f",
    rpcUrl: config.Optimism.RpcUrl,
  },
};
