import { Finding, FindingType, TransactionEvent } from "forta-agent";

export enum RedefineMode {
  Strict = "strict",
  Merge = "merge",
}

/**
 * Special wrapper under `require` function that allows to
 * redefine variables from a file with the same name and `.<tier>` suffix.
 * `<tier>` is a string that is passed as a command line run argument after `--` delimiter.
 * @param path Absolute path to the main file to import.
 * @param mode `strict` or `merge`. Default: `strict`.
 */
export function requireWithTier<T>(
  path: string,
  mode: RedefineMode = RedefineMode.Strict
): T {
  let constants = require(path);
  const tierDelimiterIndex = process.argv.lastIndexOf("--");
  if (tierDelimiterIndex != -1) {
    const tier = process.argv[tierDelimiterIndex + 1];
    let redefinedConstants: any;
    try {
      redefinedConstants = require(`${path}.${tier}`);
    } catch (e) {
      console.warn(
        `Failed to import module: '${path}.${tier}' doesn't exist. Using default`
      );
      return constants;
    }
    if (mode == RedefineMode.Strict) {
      const check = (key: string) => {
        return (
          key in redefinedConstants &&
          typeof constants[key] == typeof redefinedConstants[key]
        );
      };
      if (Object.keys(constants).every((key) => check(key))) {
        constants = redefinedConstants;
      } else {
        throw new Error(
          `Failed to import module: '${path}.${tier}' doesn't contain all keys or unmatched types with '${path}'`
        );
      }
    }
    if (mode == RedefineMode.Merge) {
      const check = (key: string) => {
        if (key in constants) {
          return typeof constants[key] == typeof redefinedConstants[key];
        } else {
          return true;
        }
      };
      if (Object.keys(redefinedConstants).every((key) => check(key))) {
        constants = { ...constants, ...redefinedConstants };
      } else {
        throw new Error(
          `Failed to import module: '${path}.${tier}' unmatched types with '${path}'`
        );
      }
    }
  }
  return constants;
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
