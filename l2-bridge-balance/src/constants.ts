import BigNumber from "bignumber.js";
import config from "./config/bot-config.json";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

// ADDRESSES AND EVENTS

export const WSTETH_ADDRESS = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";

export interface BridgeParam {
  name: string;
  l2Gateway: string;
  l1Gateway: string;
  wstEthBridged: string;
  rpcUrl: string;
}
export interface BridgeParams {
  Arbitrum: BridgeParam;
  Optimism: BridgeParam;
}

export const BRIDGE_PARAMS: BridgeParams = {
  Arbitrum: {
    name: "Arbitrum",
    l2Gateway: "0x07d4692291b9e30e326fd31706f686f83f331b82",
    l1Gateway: "0x0f25c1dc2a9922304f2eac71dca9b07e310e8e5a",
    wstEthBridged: "0x5979d7b546e38e414f7e9822514be443a4800529",
    rpcUrl: config.Arbitrum.RpcUrl,
  },
  Optimism: {
    name: "Optimism",
    l2Gateway: "0x8e01013243a96601a86eb3153f0d9fa4fbfb6957",
    l1Gateway: "0x76943c0d61395d8f2edf9060e1533529cae05de6",
    wstEthBridged: "0x1f32b1c2345538c0c6f582fcb022739c4a194ebb",
    rpcUrl: config.Optimism.RpcUrl,
  },
};

export const WITHDRAWAL_INITIATED_EVENT =
  "event WithdrawalInitiated(address l1Token, address indexed from, address indexed to, uint256 indexed l2ToL1Id, uint256 exitNum, uint256 amount)";

export const WITHDRAWAL_FINALIZED_EVENT =
  "event WithdrawalFinalized(address l1Token, address indexed from, address indexed to, uint256 indexed exitNum, uint256 amount)";
