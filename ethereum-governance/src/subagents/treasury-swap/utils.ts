import { BlockEvent, Finding, TransactionEvent, ethers, FindingType, FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import ERC20 from "../../abi/ERC20.json";
import STONKS_ABI from "../../abi/Stonks.json";
import { etherscanAddress, handleEventsOfNotice } from "../../common/utils";
import { STONKS_ORDER_CREATION } from "./constants";
import { ethersProvider } from "../../ethers";

const STETH_MAX_PRECISION = new BigNumber(4);
const createdOrders: any[] = [];

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

  // TODO:check that for-of works well with splice
  for (const order of createdOrders) {
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
