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
  Base: BridgeParamWstETH;
  ZkSync: BridgeParamWstETH;
  Mantle: BridgeParamWstETH;
  Linea: BridgeParamWstETH;
  Scroll: BridgeParamWstETH;
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
  Base: {
    name: "Base",
    l1Gateway: "0x9de443AdC5A411E83F1878Ef24C3F52C61571e72",
    wstEthBridged: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452",
    rpcUrl: config.Base.RpcUrl,
  },
  ZkSync: {
    name: "ZkSync",
    l1Gateway: "0x41527B2d03844dB6b0945f25702cB958b6d55989",
    wstEthBridged: "0x703b52F2b28fEbcB60E1372858AF5b18849FE867",
    rpcUrl: config.ZkSync.RpcUrl,
  },
  Mantle: {
    name: "Mantle",
    l1Gateway: "0x2D001d79E5aF5F65a939781FE228B267a8Ed468B",
    wstEthBridged: "0x458ed78EB972a369799fb278c0243b25e5242A83",
    rpcUrl: config.Mantle.RpcUrl,
  },
  Linea: {
    name: "Linea",
    l1Gateway: "0x051f1d88f0af5763fb888ec4378b4d8b29ea3319",
    wstEthBridged: "0xB5beDd42000b71FddE22D3eE8a79Bd49A568fC8F",
    rpcUrl: config.Linea.RpcUrl,
  },
  Scroll: {
    name: "Scroll",
    l1Gateway: "0x6625c6332c9f91f2d27c304e729b86db87a3f504",
    wstEthBridged: "0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32",
    rpcUrl: config.Scroll.RpcUrl,
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
