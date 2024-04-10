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
import {
  RedefineMode,
  etherscanAddress,
  handleEventsOfNotice,
  requireWithTier,
} from "../../common/utils";
import { ethersProvider } from "../../ethers";
import type * as Constants from "./constants";
import { EventOfNotice } from "./constants";

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
  const findings = await handleOrderSettlement(blockEvent);
  return findings;
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
  for (const order of lastCreatedOrders) {
    const duration = timestamp - order.timestamp;
    if (duration < order.orderDuration) continue;

    const tokenToSell = new ethers.Contract(
      order.tokenFrom,
      ERC20,
      ethersProvider,
    );

    const balance = new BigNumber(
      (await tokenToSell.functions.balanceOf(order.address)).toString(),
    );

    if (order.active) {
      if (balance.lte(STETH_MAX_PRECISION)) {
        findings.push(
          Finding.fromObject({
            name: "✅ Stonks: order fulfill",
            description: `Stonks order ${etherscanAddress(
              order.address,
            )} was fulfill`,
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
