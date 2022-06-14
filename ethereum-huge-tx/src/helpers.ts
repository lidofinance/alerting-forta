import {
  TransferEventInfo,
  ComplexTransferPattern,
  TransferPattern,
} from "./constants";

export function handle_complex_transfers(
  transfers: TransferEventInfo[],
  transferPattern: ComplexTransferPattern
) {
  const mainEvents = transfers.filter((transfer) =>
    matchPattern(transferPattern.transferPatterns.mainTransfer, transfer)
  );
  const mainEventsTexts = mainEvents.map((transfer) =>
    transferPattern.description(transfer)
  );
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

  return [transfersCopy, mainEventsTexts];
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
