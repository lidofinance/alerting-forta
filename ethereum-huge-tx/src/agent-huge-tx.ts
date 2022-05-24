import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
  LogDescription,
} from "forta-agent";

import {
  MONITORED_TOKENS,
  TRANSFER_EVENT,
  TX_AMOUNT_THRESHOLD,
  TX_AMOUNT_THRESHOLD_LDO,
  TransferEventInfo,
  SPECIAL_TRANSFERS,
  SpecialTransferPattern,
  PARTIALLY_MONITORED_TOKENS,
  LDO_TOKEN_ADDRESS,
} from "./constants";

export const name = "Huge TX detector";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  await Promise.all([handleHugeTx(txEvent, findings)]);
  return findings;
}

async function handleHugeTx(txEvent: TransactionEvent, findings: Finding[]) {
  let transfersTexts: string[] = [];
  const transferEvents = txEvent
    .filterLog(TRANSFER_EVENT)
    .filter(
      (event) =>
        MONITORED_TOKENS.get(event.address.toLowerCase()) ||
        PARTIALLY_MONITORED_TOKENS.get(event.address.toLowerCase())
    );
  transferEvents.forEach((event) => {
    const transferText = prepareTransferEventText(event);
    if (transferText) {
      transfersTexts.push(transferText);
    }
  });
  if (transfersTexts.length > 0) {
    findings.push(
      Finding.fromObject({
        name: "Huge token(s) of Lido interest in a single TX",
        description:
          transfersTexts.join("\n") +
          `\nhttps://etherscan.io/tx/${txEvent.hash}`,
        alertId: "HUGE-TOKEN-TRANSFERS-IN-SINGLE-TX",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
  }
}

function prepareTransferEventText(transferEvent: LogDescription) {
  const transferInfo = new TransferEventInfo(transferEvent);
  if (applicableAmount(transferInfo)) {
    for (const transferPattern of SPECIAL_TRANSFERS) {
      if (match(transferPattern, transferInfo)) {
        return transferPattern.description(transferInfo);
      }
    }
    // Do not report on common transfers of PARTIALLY_MONITORED_TOKENS
    if (!PARTIALLY_MONITORED_TOKENS.get(transferInfo.token)) {
      return (
        `**${transferInfo.amount.toFixed(2)} ${transferInfo.tokenName}** ` +
        `were transferred.\n` +
        `From: ${transferInfo.from} (${transferInfo.fromName})\n` +
        `To: ${transferInfo.to} (${transferInfo.toName})`
      );
    }
  }
}

function match(
  transferPattern: SpecialTransferPattern,
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

function applicableAmount(transferInfo: TransferEventInfo) {
  if (transferInfo.token == LDO_TOKEN_ADDRESS) {
    return transferInfo.amount.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD_LDO);
  }
  return transferInfo.amount.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD);
}
