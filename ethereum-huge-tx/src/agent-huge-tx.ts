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
  TransferEventInfo,
  PARTIALLY_MONITORED_TOKENS,
  COMPLEX_TRANSFERS_TEMPLATES,
  TransferText,
  TransferEventMetadata,
  LDO_TOKEN_ADDRESS,
} from "./constants";

import {
  handleComplexTransfers,
  etherscanLink,
  prepareTransferMetadata,
  applicableAmount,
  handleCurveExchange,
  prepareTransferEventText,
} from "./helpers";

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

  let texts: TransferText[] = [];
  let metas: TransferEventMetadata[] = [];
  [transferInfos, texts, metas] = handleCurveExchange(transferInfos, txEvent);
  transfersTexts = transfersTexts.concat(texts);
  transfersMetadata = transfersMetadata.concat(metas);

  COMPLEX_TRANSFERS_TEMPLATES.forEach((template) => {
    let texts: TransferText[] = [];
    let metas: TransferEventMetadata[] = [];
    [transferInfos, texts, metas] = handleComplexTransfers(
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
      if (transfer.token != LDO_TOKEN_ADDRESS)
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
          "\nNOTE: This is tech alert. Do not route it to the alerts channel!",
        alertId: "HUGE-TOKEN-TRANSFERS-TECH",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: meta,
      })
    );
  });
}
