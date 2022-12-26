import { ethers, Finding, FindingType } from "forta-agent";
import { JsonRpcProvider } from "@ethersproject/providers";
import { utils } from "ethers";

import { eventSig } from "./helpers";
import { GNOSIS_SAFE_EVENTS_OF_NOTICE } from "./constants";

export async function handleSafeEvents(
  findings: Finding[],
  provider: JsonRpcProvider,
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
          findings.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(
                `${safeName} (${safeAddress})`,
                parsedEvent.args
              ),
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
