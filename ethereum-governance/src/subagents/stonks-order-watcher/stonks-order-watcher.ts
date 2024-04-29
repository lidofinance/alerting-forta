import BigNumber from "bignumber.js";
import {
  BlockEvent,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
  ethers,
} from "forta-agent";
import ERC20 from "../../abi/ERC20.json";
import STONKS_ABI from "../../abi/Stonks.json";
import SWAP_ABI from "../../abi/Swap.json";
import {
  RedefineMode,
  etherscanAddress,
  handleEventsOfNotice,
  requireWithTier,
} from "../../common/utils";
import { ethersProvider } from "../../ethers";
import type * as Constants from "./constants";
import { EventOfNotice } from "./constants";
import { KNOWN_ERC20 } from "../../common/constants";
import { formatAmount } from "./utils";

export const name = "Stonks";

const {
  STONKS_EVENTS_OF_NOTICE,
  STONKS,
  BLOCK_WINDOW,
  BLOCK_TO_WATCH,
  BLOCK_TO_WATCH_TIME,
  STONKS_ORDER_CREATION,
  ORDER_EVENTS_OF_NOTICE,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge,
);

const STETH_MAX_PRECISION = new BigNumber(4);

type CreatedOrder = {
  tokenFrom: string;
  address: string;
  orderDuration: number;
  timestamp: number;
  blockNumber: number;
  active: boolean;
};
const createdOrders: CreatedOrder[] = [];
let wasInit = false; // tests run init 2 times
export async function initialize(
  currentBlockNumber: number,
): Promise<{ [key: string]: string }> {
  if (wasInit && !currentBlockNumber) {
    return {}; // skip second init in tests by current block
  }
  wasInit = true;
  const currentBlock = await ethersProvider.getBlock(currentBlockNumber);
  console.log(`[${name}]`);
  await Promise.all(
    STONKS.map(async (stonks) => {
      const stonksContract = new ethers.Contract(
        stonks.address,
        STONKS_ABI,
        ethersProvider,
      );

      const allEvents = await stonksContract.queryFilter(
        { address: stonks.address },
        currentBlockNumber - BLOCK_TO_WATCH,
        currentBlockNumber,
      );

      const events = allEvents.filter(
        (event) => event.event === "OrderContractCreated",
      );
      // no stonks past 120 min
      if (!events.length) {
        return;
      }

      const [tokenFrom, _, orderDuration] =
        await stonksContract.functions.getOrderParameters();

      await Promise.all(
        events.map(async (event) => {
          if (
            createdOrders.some(
              (order) => order.address === event?.args?.orderContract,
            )
          ) {
            return;
          }
          const block = await event.getBlock();

          createdOrders.push({
            tokenFrom,
            address: event?.args?.orderContract,
            orderDuration: orderDuration.toNumber(),
            timestamp: block.timestamp,
            blockNumber: block.number,
            active:
              currentBlock.timestamp - block.timestamp <
              orderDuration.toNumber(),
          });
        }),
      );
    }),
  );
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  if (blockEvent.blockNumber % BLOCK_WINDOW != 0) {
    return [];
  }
  return handleOrderSettlement(blockEvent);
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  await handleOrderCreation(txEvent);
  handleEventsOfNotice(txEvent, findings, STONKS_EVENTS_OF_NOTICE);
  handleEventsOfNotice(
    txEvent,
    findings,
    getOrderEventsOfNotice(createdOrders),
  );

  return findings;
}

const getOrderEventsOfNotice = (orders: CreatedOrder[]) => {
  const events: EventOfNotice[] = [];
  orders.forEach((order) => {
    return ORDER_EVENTS_OF_NOTICE.forEach((event) => {
      events.push({
        ...event,
        address: order.address,
        description: (args) =>
          event.description({ ...args, address: order.address }),
      });
    });
  });
  return events;
};

export async function handleOrderCreation(txEvent: TransactionEvent) {
  for (const stonksEvent of STONKS_ORDER_CREATION) {
    const stonksFindings: Finding[] = [];

    handleEventsOfNotice(txEvent, stonksFindings, STONKS_ORDER_CREATION);

    for (const finding of stonksFindings) {
      const stonksAddress = stonksEvent.address;
      const orderAddress = finding.metadata.args.split(",")[0].toLowerCase();
      if (createdOrders.some((order) => order.address === orderAddress)) {
        continue;
      }

      const stonksContract = new ethers.Contract(
        stonksAddress,
        STONKS_ABI,
        ethersProvider,
      );

      const [tokenFrom, _, orderDuration] =
        await stonksContract.functions.getOrderParameters();

      createdOrders.push({
        tokenFrom,
        address: orderAddress,
        orderDuration: orderDuration.toNumber(),
        timestamp: txEvent.block.timestamp,
        blockNumber: txEvent.block.number,
        active: true,
      });
    }
  }
}

export async function handleOrderSettlement(txBlock: BlockEvent) {
  const findings: Finding[] = [];
  if (createdOrders.length === 0) return findings;

  const timestamp = txBlock.block.timestamp;

  const lastCreatedOrders = [...createdOrders];
  let iface = new ethers.utils.Interface(SWAP_ABI);
  let operationInfo = "";
  // life is too short to handle orders one by one
  const orderInfo = await Promise.all(
    lastCreatedOrders.map(async (order) => {
      const duration = timestamp - order.timestamp;

      const tokenToSell = new ethers.Contract(
        order.tokenFrom,
        ERC20,
        ethersProvider,
      );

      const balance = new BigNumber(
        (await tokenToSell.functions.balanceOf(order.address)).toString(),
      );

      const fulfilled = balance.lte(STETH_MAX_PRECISION);

      const events: ethers.providers.Log[] = [];

      if (order.active && fulfilled) {
        try {
          const events = await ethersProvider.getLogs({
            fromBlock: `0x${order.blockNumber.toString(16)}`,
            toBlock: `0x${txBlock.block.number.toString(16)}`,
            address: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41", // TODO: that it is same all pairs
            topics: [
              null, // any
              order.address.replace("0x", "0x000000000000000000000000"),
            ],
          });
          const args = iface.parseLog(events[0]).args;
          const sellToken = KNOWN_ERC20.get(args?.sellToken?.toLowerCase());
          const buyToken = KNOWN_ERC20.get(args?.buyToken?.toLowerCase());
          const sellAmount = formatAmount(
            args?.sellAmount,
            sellToken?.decimals ?? 18,
            4,
          );
          const buyAmount = formatAmount(
            args?.buyAmount,
            buyToken?.decimals ?? 18,
            4,
          );

          operationInfo = `${sellAmount?.toString()} ${sellToken?.name} -> ${buyAmount} ${buyToken?.name}`;
        } catch (err) {
          console.error(err);
        }
      }

      return {
        order,
        balance,
        fulfilled,
        duration,
        events,
      };
    }),
  );

  for (const { order, fulfilled, duration, balance } of orderInfo) {
    if (duration < order.orderDuration && !fulfilled) continue;

    if (order.active) {
      if (fulfilled) {
        findings.push(
          Finding.fromObject({
            name: "✅ Stonks: order fulfilled",
            description: `Stonks order ${etherscanAddress(
              order.address,
            )} was fulfilled ${operationInfo}`,
            alertId: "STONKS-ORDER-FULFILL",
            severity: FindingSeverity.Info,
            type: FindingType.Info,
            metadata: { args: "?" },
          }),
        );
      } else {
        findings.push(
          Finding.fromObject({
            name: "❌ Stonks: order expired",
            description: `Stonks order ${etherscanAddress(
              order.address,
            )} was expired`,
            alertId: "STONKS-ORDER-EXPIRED",
            severity: FindingSeverity.Info,
            type: FindingType.Info,
            metadata: { args: "?" },
          }),
        );
      }
    }

    order.active = false;
    if (balance.lte(STETH_MAX_PRECISION) || duration > BLOCK_TO_WATCH_TIME) {
      createdOrders.splice(createdOrders.indexOf(order), 1);
    }
  }
  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
