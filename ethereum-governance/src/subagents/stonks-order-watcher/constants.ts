import { FindingSeverity } from "forta-agent";
import { etherscanAddress } from "../../common/utils";
import {
  STONKS_STETH_DAI_ADDRESS,
  STONKS_STETH_USDC_ADDRESS,
  STONKS_STETH_USDT_ADDRESS,
  STONKS_DAI_USDC_ADDRESS,
  STONKS_DAI_USDT_ADDRESS,
  STONKS_USDC_DAI_ADDRESS,
  STONKS_USDC_USDT_ADDRESS,
  STONKS_USDT_DAI_ADDRESS,
  STONKS_USDT_USDC_ADDRESS,
} from "../../common/constants";

export type EventOfNotice = {
  address: string;
  event: string;
  alertId: string;
  name: string;
  description: (args: any) => string;
  severity: number;
};

export const BLOCK_WINDOW = 5; // about 1 min (one block is 12 sec)
export const BLOCK_TO_WATCH = 600; // about 120 min (one block is 12 sec)
export const BLOCK_TO_WATCH_TIME = 12 * BLOCK_TO_WATCH;
export const STONKS = [
  {
    address: STONKS_STETH_DAI_ADDRESS,
    from: "stETH",
    to: "DAI",
  },
  {
    address: STONKS_STETH_USDC_ADDRESS,
    from: "stETH",
    to: "USDC",
  },
  {
    address: STONKS_STETH_USDT_ADDRESS,
    from: "stETH",
    to: "USDT",
  },
  {
    address: STONKS_DAI_USDC_ADDRESS,
    from: "DAI",
    to: "USDC",
  },
  {
    address: STONKS_DAI_USDT_ADDRESS,
    from: "DAI",
    to: "USDT",
  },
  {
    address: STONKS_USDC_DAI_ADDRESS,
    from: "USDC",
    to: "DAI",
  },
  {
    address: STONKS_USDC_USDT_ADDRESS,
    from: "USDC",
    to: "USDT",
  },
  {
    address: STONKS_USDT_DAI_ADDRESS,
    from: "USDT",
    to: "DAI",
  },
  {
    address: STONKS_USDT_USDC_ADDRESS,
    from: "USDT",
    to: "USDC",
  },
];
export const STONKS_ORDER_CREATION: EventOfNotice[] = [];

export const STONKS_EVENTS_OF_NOTICE: EventOfNotice[] = [];
export const ORDER_EVENTS_OF_NOTICE = [
  {
    address: "",
    event: "event ManagerSet(address manager)",
    alertId: "ORDER-MANAGER-CHANGED",
    name: "🚨 ORDER Factory: Manager changed",
    description: (args: any) =>
      `Manager of the ORDER factory was changed to ${etherscanAddress(
        args.manager,
      )}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: "",
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
    address: "",
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
    address: "",
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
    address: "",
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

// fill events by stonks
STONKS.forEach(({ address, to, from }) => {
  STONKS_ORDER_CREATION.push({
    address: address.toLocaleLowerCase(),
    event:
      "event OrderContractCreated(address indexed orderContract,uint256 minBuyAmount)",
    alertId: "STONKS-ORDER-CREATED",
    name: "ℹ️ Stonks: order created",
    description: (args: any) =>
      `Order from ${from} to ${to} created:\n` +
      `Order address: ${etherscanAddress(args.orderContract)}\n` +
      `Amount min: ${args.minBuyAmount}`,
    severity: FindingSeverity.Info,
  });
  STONKS_EVENTS_OF_NOTICE.push({
    address,
    event: "event ManagerSet(address manager)",
    alertId: "STONKS-MANAGER-CHANGED",
    name: "🚨 STONKS Factory: Manager changed",
    description: (args: any) =>
      `Manager of the STONKS factory was changed to ${etherscanAddress(
        args.manager,
      )}`,
    severity: FindingSeverity.Critical,
  });
  STONKS_EVENTS_OF_NOTICE.push({
    address,
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
  });
  STONKS_EVENTS_OF_NOTICE.push({
    address,
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
  });
  STONKS_EVENTS_OF_NOTICE.push({
    address,
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
  });
  STONKS_EVENTS_OF_NOTICE.push({
    address,
    event: "event EtherRecovered(address indexed recipient, uint256 amount)",
    alertId: "STONKS-ETHER-RECOVERED",
    name: "ℹ️ Order: Ether recovered",
    description: (args: any) =>
      `Ether recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  });
});
