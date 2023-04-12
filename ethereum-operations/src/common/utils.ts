import { Finding, FindingType, TransactionEvent } from "forta-agent";

class ModuleDoesNotContainAllKeysError extends Error {}

export const requireConstants = <T>(path: string): T => {
  let constants = require(path);
  const tierDelimiterIndex = process.argv.lastIndexOf("--");
  if (tierDelimiterIndex != -1) {
    const tier = process.argv[tierDelimiterIndex + 1];
    let redefinedConstants = {};
    redefinedConstants = require(`${path}.${tier}`);
    if (Object.keys(constants).every((key) => key in redefinedConstants)) {
      constants = redefinedConstants;
    } else {
      throw new ModuleDoesNotContainAllKeysError(
        `Failed to import constants module: ${path}.${tier} doesn't contain all keys from ${path}`
      );
    }
  }
  return constants;
};

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
