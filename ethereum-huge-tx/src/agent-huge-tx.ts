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
import { handle_complex_transfers, matchPattern } from "./helpers";

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
  console.log(transferInfos);
  COMPLEX_TRANSFERS_TEMPLATES.forEach((template) => {
    let texts: TransferText[] = [];
    [transferInfos, texts] = handle_complex_transfers(transferInfos, template);
    transfersTexts = transfersTexts.concat(texts);
  });

  transferInfos.forEach((transfer) => {
    const transferText = prepareTransferEventText(transfer);
    if (transferText) {
      transfersTexts.push(transferText);
    }
  });
  transfersTexts.sort((a, b) => a.logIndex - b.logIndex);
  if (transfersTexts.length > 0) {
    findings.push(
      Finding.fromObject({
        name: "Huge token(s) of Lido interest in a single TX",
        description:
          transfersTexts.map((tt) => tt.text).join("\n") +
          `\nhttps://etherscan.io/tx/${txEvent.hash}`,
        alertId: "HUGE-TOKEN-TRANSFERS-IN-SINGLE-TX",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
  }
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
