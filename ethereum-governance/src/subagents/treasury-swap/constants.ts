import { FindingSeverity } from "forta-agent";
import { etherscanAddress } from "../../common/utils";
import {
  STONKS_STETH_DAI_ADDRESS as stonksStethDaiAddress,
  STONKS_STETH_USDC_ADDRESS as stonksStethUsdcAddress,
  STONKS_STETH_USDT_ADDRESS as stonksStethUsdtAddress,
  STONKS_DAI_USDC_ADDRESS as stonksDaiUsdcAddress,
  STONKS_DAI_USDT_ADDRESS as stonksDaiUsdtAddress,
  STONKS_USDC_DAI_ADDRESS as stonksUsdcDaiAddress,
  STONKS_USDC_USDT_ADDRESS as stonksUsdcUsdtAddress,
  STONKS_USDT_DAI_ADDRESS as stonksUsdtDaiAddress,
  STONKS_USDT_USDC_ADDRESS as stonksUsdtUsdcAddress,
  STONKS_TESTFLIGHT_ADDRESS as stonksTestflightAddress,
  ORDER_ADDRESS as orderAddress,
} from "../../common/constants";

export const BLOCK_INTERVAL = 150 // about 30 min (one block is 12 sec)

export const STONKS = [
  {
    address: stonksStethDaiAddress,
    from: 'stETH',
    to: 'DAI',
  },
  {
    address: stonksStethUsdcAddress,
    from: 'stETH',
    to: 'USDC',
  },
  {
    address: stonksStethUsdtAddress,
    from: 'stETH',
    to: 'USDT',
  },
  {
    address: stonksDaiUsdcAddress,
    from: 'DAI',
    to: 'USDC',
  },
  {
    address: stonksDaiUsdtAddress,
    from: 'DAI',
    to: 'USDT',
  },
  {
    address: stonksUsdcDaiAddress,
    from: 'USDC',
    to: 'DAI',
  },
  {
    address: stonksUsdcUsdtAddress,
    from: 'USDC',
    to: 'USDT',
  },
  {
    address: stonksUsdtDaiAddress,
    from: 'USDT',
    to: 'USDC',
  },
  {
    address: stonksUsdtUsdcAddress,
    from: 'USDT',
    to: 'USDC',
  },
  {
    address: stonksTestflightAddress,
    from: 'stETH',
    to: 'DAI',
  }
]
export const ORDER_ADDRESS = orderAddress;

export const STONKS_ORDER_CREATION: Record<string, any>[] = [];

export const TREASURY_SWAP_EVENTS_OF_NOTICE = [
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

// fill events by stonks
STONKS.forEach(({address, to, from}) => {
  TREASURY_SWAP_EVENTS_OF_NOTICE.push({
    address,
    event: "event ManagerSet(address manager)",
    alertId: "STONKS-MANAGER-CHANGED",
    name: "🚨 STONKS Factory: Manager changed",
    description: (args: any) =>
    `Manager of the STONKS factory was changed to ${etherscanAddress(
      args.manager
    )}`,
    severity: FindingSeverity.Critical,
  })
  TREASURY_SWAP_EVENTS_OF_NOTICE.push({
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
  })
  TREASURY_SWAP_EVENTS_OF_NOTICE.push({
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
  })
  TREASURY_SWAP_EVENTS_OF_NOTICE.push({
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
  })
  TREASURY_SWAP_EVENTS_OF_NOTICE.push({
    address,
    event: "event EtherRecovered(address indexed recipient, uint256 amount)",
    alertId: "STONKS-ETHER-RECOVERED",
    name: "ℹ️ Order: Ether recovered",
    description: (args: any) =>
    `Ether recovered:\n` +
    `Requested by: ${etherscanAddress(args.recipient)}\n` +
    `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  })

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
  })
})