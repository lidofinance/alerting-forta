import { FindingSeverity } from "forta-agent";
import { etherscanAddress } from "../../common/utils";
import {
  STONKS_ADDRESS as stonksAddress,
  ORDER_ADDRESS as orderAddress,
} from "../../common/constants";

export const STONKS_ADDRESS = stonksAddress;
export const ORDER_ADDRESS = orderAddress;

export const STONKS_ORDER_CREATION = [
  {
    address: stonksAddress.toLocaleLowerCase(),
    event:
      "event OrderContractCreated(address indexed orderContract,uint256 minBuyAmount)",
    alertId: "STONKS-ORDER-CREATED",
    name: "ℹ️ Stonks: order created",
    description: (args: any, extraData: any) => {
      return "Order contract created";
    },
    severity: FindingSeverity.Info,
  },
];

export const TREASURY_SWAP_EVENTS_OF_NOTICE = [
  {
    address: stonksAddress,
    event: "event ManagerSet(address manager)",
    alertId: "STONKS-MANAGER-CHANGED",
    name: "🚨 STONKS Factory: Manager changed",
    description: (args: any) =>
      `Manager of the STONKS factory was changed to ${etherscanAddress(
        args.manager
      )}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: stonksAddress,
    event:
      "event ERC20Recovered(address indexed token, address indexed recipient, uint256 amount)",
    alertId: "STONKS-ERC20-RECOVERED",
    name: "ℹ️ Order: ERC20 recovered",
    description: (args: any) =>
      `ERC20 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: stonksAddress,
    event:
      "event ERC721Recovered(address indexed token, uint256 tokenId, address indexed recipient)",
    alertId: "STONKS-ERC721-RECOVERED",
    name: "ℹ️ Order: ERC721 recovered",
    description: (args: any) =>
      `ERC721 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}`,
    severity: FindingSeverity.Info,
  },
  {
    address: stonksAddress,
    event:
      "event ERC1155Recovered(address token, uint256 tokenId, address recipient, uint256 amount)",
    alertId: "STONKS-ERC1155-RECOVERED",
    name: "ℹ️ Order: ERC1155 recovered",
    description: (args: any) =>
      `ERC1155 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: stonksAddress,
    event: "event EtherRecovered(address indexed recipient, uint256 amount)",
    alertId: "STONKS-ETHER-RECOVERED",
    name: "ℹ️ Order: Ether recovered",
    description: (args: any) =>
      `Ether recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: stonksAddress,
    event:
      "event OrderContractCreated(address indexed orderContract,uint256 minBuyAmount)",
    alertId: "STONKS-ORDER-CREATED",
    name: "ℹ️ Stonks: order created",
    severity: FindingSeverity.Info,
  },
  {
    address: orderAddress,
    event: "event ManagerSet(address manager)",
    alertId: "ORDER-MANAGER-CHANGED",
    name: "🚨 ORDER Factory: Manager changed",
    description: (args: any) =>
      `Manager of the ORDER factory was changed to ${etherscanAddress(
        args.manager
      )}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: orderAddress,
    event:
      "event ERC20Recovered(address indexed token, address indexed recipient, uint256 amount)",
    alertId: "ORDER-ERC20-RECOVERED",
    name: "ℹ️ Order: ERC20 recovered",
    description: (args: any) =>
      `ERC20 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: orderAddress,
    event:
      "event ERC721Recovered(address indexed token, uint256 tokenId, address indexed recipient)",
    alertId: "ORDER-ERC721-RECOVERED",
    name: "ℹ️ Order: ERC721 recovered",
    description: (args: any) =>
      `ERC721 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}`,
    severity: FindingSeverity.Info,
  },
  {
    address: orderAddress,
    event:
      "event ERC1155Recovered(address token, uint256 tokenId, address recipient, uint256 amount)",
    alertId: "ORDER-ERC1155-RECOVERED",
    name: "ℹ️ Order: ERC1155 recovered",
    description: (args: any) =>
      `ERC1155 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: orderAddress,
    event: "event EtherRecovered(address indexed recipient, uint256 amount)",
    alertId: "ORDER-ETHER-RECOVERED",
    name: "ℹ️ Order: Ether recovered",
    description: (args: any) =>
      `Ether recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
];

export const createOrderWatchEvent = (
  address: string,
  timestamp: Date
) => {
  return {
    address,
    timestamp,
    event: {
      address: address,
      event:
        "event Trade(address indexed owner, IERC20 sellToken, IERC20 buyToken, uint256 sellAmount, uint256 buyAmount, uint256 feeAmount, bytes orderUid)",
      alertId: "STONKS-ORDER-SETTLED",
      name: "✅ Stonks: Order settled",
      description: (args: any) => {
        return "settled";
      },
      severity: FindingSeverity.Info,
    },
  };
};
