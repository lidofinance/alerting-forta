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
  SIMPLE_TRANSFERS,
  PARTIALLY_MONITORED_TOKENS,
  LDO_TOKEN_ADDRESS,
  COMPLEX_TRANSFERS_TEMPLATES,
  TransferText,
} from "./constants";
import {
  handle_complex_transfers,
  matchPattern,
  etherscanLink,
  prepareTransferMetadata,
} from "./helpers";
import { TransferEventMetadata } from "./constants";

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
  let transfersTexts: TransferText[] = [];
  let transfersMetadata: TransferEventMetadata[] = [];
  const transferEvents = txEvent
    .filterLog(TRANSFER_EVENT)
    .filter(
      (event) =>
        MONITORED_TOKENS.get(event.address.toLowerCase()) ||
        PARTIALLY_MONITORED_TOKENS.get(event.address.toLowerCase())
    );

  let transferInfos = transferEvents.map(
    (event) => new TransferEventInfo(event)
  );
  transferInfos = transferInfos.filter((transfer) =>
    applicableAmount(transfer)
  );
  COMPLEX_TRANSFERS_TEMPLATES.forEach((template) => {
    let texts: TransferText[] = [];
    let metas: TransferEventMetadata[] = [];
    [transferInfos, texts, metas] = handle_complex_transfers(
      transferInfos,
      template,
      txEvent
    );
    transfersTexts = transfersTexts.concat(texts);
    transfersMetadata = transfersMetadata.concat(metas);
  });

  transferInfos.forEach((transfer) => {
    const transferText = prepareTransferEventText(transfer);
    if (transferText) {
      transfersTexts.push(transferText);
      transfersMetadata.push(
        prepareTransferMetadata(transfer, txEvent, transferText.text)
      );
    }
  });
  transfersTexts.sort((a, b) => a.logIndex - b.logIndex);
  if (transfersTexts.length > 0) {
    findings.push(
      Finding.fromObject({
        name: "Huge token(s) transfer of Lido interest in a single TX",
        description:
          transfersTexts.map((tt) => tt.text).join("\n") +
          `\n${etherscanLink(txEvent.hash)}`,
        alertId: "HUGE-TOKEN-TRANSFERS-IN-SINGLE-TX",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
  }
  transfersMetadata.forEach((meta) => {
    const text = meta.comment;
    meta.comment = meta.comment.split("\n")[0].split("*").join("");
    findings.push(
      Finding.fromObject({
        name: "Huge token transfer of Lido interest (tech)",
        description:
          text +
          `\n${etherscanLink(txEvent.hash)}` +
          "\nNOTE: THis is tech alert. Do not route it to the alerts channel!",
        alertId: "HUGE-TOKEN-TRANSFERS-TECH",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: meta,
      })
    );
  });
}

function prepareTransferEventText(transferInfo: TransferEventInfo) {
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
      `**${transferInfo.amount.toFixed(2)} ${transferInfo.tokenName}** ` +
      `were transferred.\n` +
      `From: ${transferInfo.from} (${transferInfo.fromName})\n` +
      `To: ${transferInfo.to} (${transferInfo.toName})`;
    return transferText;
  }
}

function applicableAmount(transferInfo: TransferEventInfo) {
  if (transferInfo.token == LDO_TOKEN_ADDRESS) {
    return transferInfo.amount.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD_LDO);
  }
  return transferInfo.amount.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD);
}
