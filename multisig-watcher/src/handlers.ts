import { ethers, Finding, FindingType, TransactionEvent } from "forta-agent";
import { JsonRpcProvider } from "@ethersproject/providers";
import { utils } from "ethers";

import { eventSig } from "./helpers";
import { Blockchain, GNOSIS_SAFE_EVENTS_OF_NOTICE, SafeTX } from "./constants";

export async function handleSafeEvents(
  findings: Finding[],
  provider: JsonRpcProvider,
  blockchain: Blockchain,
  safes: string[][],
  fromBlock: number,
  toBlock: number
) {
  await Promise.all(
    safes.map(async (safeInfo) => {
      const [safeAddress, safeName] = safeInfo;
      const logs = await provider.getLogs({
        address: safeAddress,
        fromBlock: fromBlock,
        toBlock: toBlock,
      });
      GNOSIS_SAFE_EVENTS_OF_NOTICE.forEach((eventInfo) => {
        let iface = new ethers.utils.Interface([eventInfo.event]);
        const events = logs.filter((log) =>
          log.topics.includes(utils.id(eventSig(eventInfo.event)))
        );
        events.forEach((event) => {
          const parsedEvent = iface.parseLog(event);
          const safeTx: SafeTX = {
            tx: event.transactionHash,
            safeAddress: safeAddress,
            safeName: safeName,
            safeTx: parsedEvent.args.txHash || "",
            blockchain: blockchain,
          };
          findings.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(safeTx, parsedEvent.args),
              alertId: eventInfo.alertId,
              severity: eventInfo.severity,
              type: FindingType.Info,
              metadata: { args: String(parsedEvent.args) },
            })
          );
        });
      });
    })
  );
}
