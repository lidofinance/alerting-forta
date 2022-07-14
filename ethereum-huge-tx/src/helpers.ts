import { TransactionEvent } from "forta-agent";
import BigNumber from "bignumber.js";

import {
  TransferEventInfo,
  ComplexTransferPattern,
  TransferPattern,
  TransferText,
  TransferEventMetadata,
  ETH_DECIMALS,
  CURVE_EXCHANGE_EVENT,
  EXCHANGE_ETH_TO_STETH_CURVE_PATTERN,
  EXCHANGE_STETH_TO_ETH_CURVE_PATTERN,
  TX_AMOUNT_THRESHOLD,
  PARTIALLY_MONITORED_TOKENS,
  SIMPLE_TRANSFERS,
  TX_AMOUNT_THRESHOLD_LDO,
  LDO_TOKEN_ADDRESS,
  CURVE_POOL_ADDRESS,
} from "./constants";

const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

export function handleComplexTransfers(
  transfers: TransferEventInfo[],
  transferPattern: ComplexTransferPattern,
  txEvent: TransactionEvent
): [TransferEventInfo[], TransferText[], TransferEventMetadata[]] {
  const mainTransfers = transfers.filter((transfer) =>
    matchPattern(transferPattern.transferPatterns.mainTransfer, transfer)
  );
  const mainTransfersTexts: TransferText[] = [];
  const mainTransfersMetadata: TransferEventMetadata[] = [];
  mainTransfers.forEach((mainTransfer) => {
    const mainPattern: TransferPattern = {
      contract: mainTransfer.token,
      from: mainTransfer.from,
      to: mainTransfer.to,
    };
    let additionalPatterns = Array.from(
      transferPattern.transferPatterns.additionalTransfers
    );
    if (transferPattern.transferPatterns.mainTransfer.from) {
      additionalPatterns = additionalPatterns.map((pattern) => {
        let updatedPattern = pattern;
        updatedPattern.from = mainTransfer.to;
        return updatedPattern;
      });
    } else {
      additionalPatterns = additionalPatterns.map((pattern) => {
        let updatedPattern = pattern;
        updatedPattern.to = mainTransfer.from;
        return updatedPattern;
      });
    }
    let additionalMatched = 0;
    const transfersNew = transfers.filter((transfer) => {
      if (matchPattern(mainPattern, transfer)) {
        return false;
      }
      for (const pattern of additionalPatterns) {
        if (matchPattern(pattern, transfer)) {
          additionalMatched += 1;
          return false;
        }
      }
      return true;
    });
    // Overall pattern is not matched if not all additional patterns matched
    if (additionalMatched == additionalPatterns.length) {
      const mainEventText = transferPattern.description(mainTransfer);
      mainTransfersTexts.push({
        text: mainEventText,
        logIndex: mainTransfer.logIndex,
      });
      mainTransfersMetadata.push(
        prepareTransferMetadata(mainTransfer, txEvent, mainEventText)
      );
      transfers = Array.from(transfersNew);
    }
  });

  return [transfers, mainTransfersTexts, mainTransfersMetadata];
}

export function matchPattern(
  transferPattern: TransferPattern,
  transferInfo: TransferEventInfo
): boolean {
  if (
    transferPattern.contract &&
    transferInfo.token != transferPattern.contract.toLowerCase()
  ) {
    return false;
  }
  if (
    transferPattern.from &&
    transferInfo.from != transferPattern.from.toLowerCase()
  ) {
    return false;
  }
  if (
    transferPattern.to &&
    transferInfo.to != transferPattern.to.toLowerCase()
  ) {
    return false;
  }
  return true;
}

export function prepareTransferMetadata(
  transfer: TransferEventInfo,
  txEvent: TransactionEvent,
  alertText: string
): TransferEventMetadata {
  return {
    timestamp: txEvent.timestamp.toFixed(),
    from: transfer.from,
    fromName: transfer.fromName != "unknown" ? transfer.fromName : "",
    to: transfer.to,
    toName: transfer.toName != "unknown" ? transfer.toName : "",
    amount: transfer.amount.toFixed(2),
    token: transfer.tokenName,
    comment: alertText,
    link: etherscanLink(txEvent.hash),
  };
}

export function etherscanLink(txHash: string): string {
  return `https://etherscan.io/tx/${txHash}`;
}

export function handleCurveExchange(
  transferInfos: TransferEventInfo[],
  txEvent: TransactionEvent
): [TransferEventInfo[], TransferText[], TransferEventMetadata[]] {
  const exchangeEvents = txEvent.filterLog(
    CURVE_EXCHANGE_EVENT,
    CURVE_POOL_ADDRESS
  );
  const exTransfersTexts: TransferText[] = [];
  const exTransfersMetadata: TransferEventMetadata[] = [];

  exchangeEvents.forEach((event) => {
    const sold = new BigNumber(String(event.args.tokens_sold)).div(
      ETH_DECIMALS
    );
    const bought = new BigNumber(String(event.args.tokens_bought)).div(
      ETH_DECIMALS
    );
    const buyer = event.args.buyer;
    let text: string = "";
    let pattern: TransferPattern;
    if (event.args.sold_id.toNumber() == 0) {
      pattern = EXCHANGE_ETH_TO_STETH_CURVE_PATTERN;
      pattern.to = buyer.toLowerCase();
      text =
        `**${sold.toFixed(2)} ETH** traded for **${bought.toFixed(
          2
        )} stETH** in Curve LP.\n` +
        ` Rate 1 ETH = ${bought.div(sold).toFixed(4)} stETH.`;
    } else {
      pattern = EXCHANGE_STETH_TO_ETH_CURVE_PATTERN;
      pattern.from = buyer.toLowerCase();
      text =
        `**${sold.toFixed(2)} stETH** traded for **${bought.toFixed(
          2
        )} ETH** in Curve LP.\n` +
        ` Rate 1 stETH = ${bought.div(sold).toFixed(4)} ETH.\n`;
    }
    if (
      sold.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD) ||
      bought.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD)
    ) {
      let exTransferInfos: TransferEventInfo[] = [];
      transferInfos = transferInfos.filter((info) => {
        if (matchPattern(pattern, info)) {
          exTransferInfos.push(info);
          return false;
        }
        return true;
      });
      if (exTransferInfos.length > 1) {
        throw Error(
          `More than 1 transfer event matched to a single exchange event! tx: ${txEvent.hash}`
        );
      }
      const exTransferInfo = exTransferInfos[0];
      exTransfersTexts.push({
        text:
          text + `\nBy: ${exTransferInfo.from} (${exTransferInfo.fromName})`,
        logIndex: exTransferInfo.logIndex,
      });
      exTransfersMetadata.push(
        prepareTransferMetadata(exTransferInfo, txEvent, text)
      );
    }
  });
  return [transferInfos, exTransfersTexts, exTransfersMetadata];
}

export function prepareTransferEventText(transferInfo: TransferEventInfo) {
  let transferText: TransferText = {
    text: "",
    logIndex: transferInfo.logIndex,
  };
  for (const transferPattern of SIMPLE_TRANSFERS) {
    if (matchPattern(transferPattern, transferInfo)) {
      transferText.text = transferPattern.description(transferInfo);
      return transferText;
    }
  }
  // Do not report on common transfers of PARTIALLY_MONITORED_TOKENS
  if (!PARTIALLY_MONITORED_TOKENS.get(transferInfo.token)) {
    transferText.text =
      `**${transferInfo.amountPretty} ${transferInfo.tokenName}** ` +
      `were transferred.\n` +
      `From: ${transferInfo.from} (${transferInfo.fromName})\n` +
      `To: ${transferInfo.to} (${transferInfo.toName})`;
    return transferText;
  }
}

export function applicableAmount(transferInfo: TransferEventInfo) {
  if (transferInfo.token == LDO_TOKEN_ADDRESS) {
    return transferInfo.amount.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD_LDO);
  }
  return transferInfo.amount.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD);
}

export function abbreviateNumber(number: number): string {
  // what tier? (determines SI symbol)
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;

  // if zero, we don't need a suffix
  if (tier == 0) return Math.round(number).toString();

  // get suffix and determine scale
  const suffix = SI_SYMBOL[tier];
  const scale = Math.pow(10, tier * 3);

  // scale the number
  const scaled = number / scale;

  // format number and add suffix
  return scaled.toFixed(1) + suffix;
}
