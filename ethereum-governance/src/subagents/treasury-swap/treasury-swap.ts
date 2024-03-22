import { Finding, TransactionEvent, BlockEvent, ethers, FindingSeverity, FindingType } from "forta-agent";
import { ethersProvider } from "../../ethers";
import {
  etherscanAddress,
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier
} from "../../common/utils";
import type * as Constants from "./constants";
import STONKS_ABI from "../../abi/Stonks.json";
import { STONKS_ORDER_CREATION } from "./constants";
import ERC20 from "../../abi/ERC20.json";
import BigNumber from "bignumber.js";

export const name = "Stonks";

const { TREASURY_SWAP_EVENTS_OF_NOTICE, STONKS, BLOCK_INTERVAL } = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

const STETH_MAX_PRECISION = new BigNumber(4);
const createdOrders: any[] = [];


export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  await Promise.all(STONKS.map(async stonks => {
    console.log(`[${name}]`);

    const stonksContract = new ethers.Contract(
      stonks.address,
      STONKS_ABI,
      ethersProvider
    );

    const allEvents = await stonksContract.queryFilter(
      {address: stonks.address},
      currentBlock - BLOCK_INTERVAL,
      `0x${(currentBlock).toString(16)}`
    )

    const events = allEvents.filter(event => event.event === 'OrderContractCreated')
    // no stonks past 30 min
    if (!events.length) {
      return
    }

    const [tokenFrom, _, orderDuration] =
      await stonksContract.functions.getOrderParameters();

    await Promise.all(events.map(async event => {
      const block = await event.getBlock()
      createdOrders.push({
        tokenFrom,
        address: event?.args?.orderContract,
        orderDuration: orderDuration.toNumber(),
        timestamp: block.timestamp,
      });
    }))
  }))

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings = await handleOrderSettlement(blockEvent);
  return findings;
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleOrderCreation(txEvent),
    handleEventsOfNotice(txEvent, findings, TREASURY_SWAP_EVENTS_OF_NOTICE),
  ]);

  return findings;
}

export async function handleOrderCreation(txEvent: TransactionEvent ) {
  for (const stonksEvent of STONKS_ORDER_CREATION) {
    const stonksFindings: Finding[] = [];

    handleEventsOfNotice(txEvent, stonksFindings, STONKS_ORDER_CREATION);

    for (const finding of stonksFindings) {
      const stonksAddress = stonksEvent.address;
      const orderAddress = finding.metadata.args.split(",")[0].toLowerCase();
      const stonksContract = new ethers.Contract(
        stonksAddress,
        STONKS_ABI,
        ethersProvider
      );

      const [tokenFrom, _, orderDuration] =
        await stonksContract.functions.getOrderParameters();

      createdOrders.push({
        tokenFrom,
        address: orderAddress,
        orderDuration: orderDuration.toNumber(),
        timestamp: txEvent.block.timestamp,
      });
    }
  }
}

export async function handleOrderSettlement(txBlock: BlockEvent) {
  const findings: Finding[] = [];
  if (createdOrders.length === 0) return findings;

  const timestamp = txBlock.block.timestamp;

  const lastCreatedOrders = [...createdOrders]
  for (const order of lastCreatedOrders) {
    if (timestamp < order.timestamp + order.orderDuration) continue;

    const tokenToSell = new ethers.Contract(
      order.tokenFrom,
      ERC20,
      ethersProvider
    );

    const balance = new BigNumber(
      (await tokenToSell.functions.balanceOf(order.address)).toString()
    );

    if (balance.lte(STETH_MAX_PRECISION)) {
      findings.push(Finding.fromObject({
        name: "✅ Stonks: order fulfill",
        description: `Stonks order ${etherscanAddress(order.address)} was fulfill`,
        alertId: "STONKS-ORDER-FULFILL",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: { args: '?' },
      }))
    } else {
      findings.push(Finding.fromObject({
        name: "❌ Stonks: order expired",
        description: `Stonks order ${etherscanAddress(order.address)} was expired`,
        alertId: "STONKS-ORDER-EXPIRED",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: { args: '?' },
      }))
    }

    createdOrders.splice(createdOrders.indexOf(order), 1);
  }
  return findings
}


// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
