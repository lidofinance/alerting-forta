import { Finding, FindingType, TransactionEvent } from "forta-agent";
import { RUN_TIER } from "./constants";

export enum RedefineMode {
  Strict = "strict",
  Merge = "merge",
}

export function mergeFindings(findings: Finding[]): Finding[] {
  const mergedFindings: Finding[] = [];
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
    mergedFindings.push(mergedFinding);
  });
  return mergedFindings;
}

export function etherscanAddress(address: string): string {
  const subpath =
    process.env.FORTA_AGENT_RUN_TEAR == "testnet" ? "goerli." : "";
  return `[${address}](https://${subpath}etherscan.io/address/${address})`;
}

/**
 * Special wrapper under `require` function that allows to
 * redefine variables from a file with the same name and `.<tier>` suffix.
 * `<tier>` is a string that is passed by `FORTA_AGENT_RUN_TEAR` environment variable.
 * @param module module object to get the path from.
 * @param path relative to module path to the main file to import.
 * @param mode `strict` or `merge`. Default: `strict`.
 */
export function requireWithTier<T>(
  module: NodeModule,
  path: string,
  mode: RedefineMode = RedefineMode.Strict
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
        with '${module.path}/${path}'`
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
        `Failed to import module: '${path}.${RUN_TIER}' unmatched types with '${path}'`
      );
    }
  }
  throw new Error(`Unknown require mode: ${mode}`);
}

export function handleEventsOfNotice(
  txEvent: TransactionEvent,
  findings: Finding[],
  eventsOfNotice: any[]
) {
  eventsOfNotice.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          })
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
