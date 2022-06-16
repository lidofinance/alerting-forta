import { TransactionEvent } from "forta-agent";

import {
  TransferEventInfo,
  ComplexTransferPattern,
  TransferPattern,
  TransferText,
  TransferEventMetadata,
} from "./constants";

export function handle_complex_transfers(
  transfers: TransferEventInfo[],
  transferPattern: ComplexTransferPattern,
  txEvent: TransactionEvent
): [TransferEventInfo[], TransferText[], TransferEventMetadata[]] {
  const mainEvents = transfers.filter((transfer) =>
    matchPattern(transferPattern.transferPatterns.mainTransfer, transfer)
  );
  const mainEventsTexts: TransferText[] = [];
  const mainEventsMetadata: TransferEventMetadata[] = [];

  mainEvents.forEach((transfer) => {
    const mainEventText = transferPattern.description(transfer);
    mainEventsTexts.push({
      text: mainEventText,
      logIndex: transfer.logIndex,
    });
    mainEventsMetadata.push(
      prepareTransferMetadata(transfer, txEvent, mainEventText)
    );
  });

  let additionalPatterns = Array.from(
    transferPattern.transferPatterns.additionalTransfers
  );
  mainEvents.forEach((mainEvent) => {
    if (transferPattern.transferPatterns.mainTransfer.from) {
      additionalPatterns = additionalPatterns.map((pattern) => {
        let updatedPattern = pattern;
        updatedPattern.from = mainEvent.to;
        return updatedPattern;
      });
    } else {
      additionalPatterns = additionalPatterns.map((pattern) => {
        let updatedPattern = pattern;
        updatedPattern.to = mainEvent.from;
        return updatedPattern;
      });
    }
  });
  const transfersCopy = transfers.filter((transfer) => {
    if (matchPattern(transferPattern.transferPatterns.mainTransfer, transfer)) {
      return false;
    }
    for (const pattern of additionalPatterns) {
      if (matchPattern(pattern, transfer)) {
        return false;
      }
    }
    return true;
  });

  return [transfersCopy, mainEventsTexts, mainEventsMetadata];
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
