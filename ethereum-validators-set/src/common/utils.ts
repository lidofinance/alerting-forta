import { Finding, FindingType, TransactionEvent } from "forta-agent";
import { RUN_TIER, LOG_FILTER_CHUNK } from "./constants";
import { Contract, EventFilter, Event } from "ethers";

export enum RedefineMode {
  Strict = "strict",
  Merge = "merge",
}

export function mergeFindings(findings: Finding[]): Finding[] {
  const mergedFindingsList: Finding[] = [];
  const findingsByAlertId = findings.reduce((acc, finding) => {
    if (!acc.has(finding.alertId)) {
      acc.set(finding.alertId, [finding]);
    } else {
      acc.get(finding.alertId)?.push(finding);
    }
    return acc;
  }, new Map<string, Finding[]>());
  findingsByAlertId.forEach((findings) => {
    const mergedFinding = Finding.fromObject({
      ...findings[0],
      description: findings.map((f) => f.description).join("\n---\n"),
      metadata: {
        ...findings[0].metadata,
        args: findings.map((f) => f.metadata.args).join(","),
      },
    });
    mergedFindingsList.push(mergedFinding);
  });
  return mergedFindingsList;
}

function getSubpathForNetwork(): string {
  let subpathForNetwork = "";
  if (process.env.FORTA_AGENT_RUN_TIER) {
    subpathForNetwork = `${subpathForNetwork}.`;
  }

  return subpathForNetwork;
}

export function etherscanAddress(address: string): string {
  return `[${address}](https://${getSubpathForNetwork()}etherscan.io/address/${address})`;
}

export function etherscanNft(address: string, id: number | string): string {
  return `[${id}](https://${getSubpathForNetwork}etherscan.io/nft/${address}/${id})`;
}

/**
 * Special wrapper under `require` function that allows to
 * redefine variables from a file with the same name and `.<tier>` suffix.
 * `<tier>` is a string that is passed by `FORTA_AGENT_RUN_TIER` environment variable.
 * @param module module object to get the path from.
 * @param path relative to module path to the main file to import.
 * @param mode `strict` or `merge`. Default: `strict`.
 */
export function requireWithTier<T>(
  module: NodeModule,
  path: string,
  mode: RedefineMode = RedefineMode.Strict,
): T {
  const defaultContent = require(`${module.path}/${path}`);
  if (!RUN_TIER) return defaultContent;
  let tieredContent: any;
  try {
    tieredContent = require(`${module.path}/${path}.${RUN_TIER}`);
    module.exports.__tier__ = RUN_TIER;
  } catch (e) {
    return defaultContent;
  }
  if (mode == RedefineMode.Strict) {
    const valid = (key: string) => {
      return (
        key in tieredContent &&
        typeof defaultContent[key] == typeof tieredContent[key]
      );
    };
    if (Object.keys(defaultContent).every((key) => valid(key))) {
      return tieredContent;
    } else {
      throw new Error(
        `Failed to import module: '${module.path}/${path}.${RUN_TIER}' doesn't contain all keys or unmatched types 
        with '${module.path}/${path}'`,
      );
    }
  }
  if (mode == RedefineMode.Merge) {
    const valid = (key: string) => {
      if (key in defaultContent) {
        return typeof defaultContent[key] == typeof tieredContent[key];
      } else {
        return true;
      }
    };
    if (Object.keys(tieredContent).every((key) => valid(key))) {
      return { ...defaultContent, ...tieredContent };
    } else {
      throw new Error(
        `Failed to import module: '${path}.${RUN_TIER}' unmatched types with '${path}'`,
      );
    }
  }
  throw new Error(`Unknown require mode: ${mode}`);
}

export function handleEventsOfNotice(
  txEvent: TransactionEvent,
  findings: Finding[],
  eventsOfNotice: any[],
  externalData?: any,
) {
  eventsOfNotice.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: externalData
              ? eventInfo.description(event.args, externalData)
              : eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          }),
        );
      });
    }
  });
}

export function formatDelay(fullDelaySec: number) {
  let sign = fullDelaySec >= 0 ? 1 : -1;
  let delayHours = 0;
  let delayMin = Math.floor((sign * fullDelaySec) / 60);
  let delaySec = sign * fullDelaySec - delayMin * 60;
  if (delayMin >= 60) {
    delayHours = Math.floor(delayMin / 60);
    delayMin -= delayHours * 60;
  }
  return (
    (sign == 1 ? "" : "-") +
    (delayHours > 0 ? `${delayHours} hrs ` : "") +
    (delayMin > 0 ? `${delayMin} min ` : "") +
    `${delaySec} sec`
  );
}

export function eventSig(abi: string) {
  let sig = abi.replace("event ", "");
  let [name, argsStr] = sig.split("(");
  let argsRaw = argsStr.split(")")[0].split(",");
  let args: string[] = [];
  argsRaw.map((arg) => args.push(arg.trim().split(" ")[0]));
  return `${name}(${args.join(",")})`;
}

export async function getLogsByChunks(
  contract: Contract,
  filter: EventFilter,
  startblock: number,
  endBlock: number,
) {
  let events: Event[] = [];
  let endBlockChunk;
  let startBlockChunk = startblock;
  do {
    endBlockChunk =
      endBlock > startBlockChunk + LOG_FILTER_CHUNK - 1
        ? startBlockChunk + LOG_FILTER_CHUNK - 1
        : endBlock;
    const eventsChunk = await contract.queryFilter(
      filter,
      startBlockChunk,
      endBlockChunk,
    );
    events.push(...eventsChunk);
    startBlockChunk = endBlockChunk + 1;
  } while (endBlockChunk < endBlock);
  return events;
}
