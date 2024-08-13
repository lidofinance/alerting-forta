import { Finding, FindingSeverity, FindingType } from "forta-agent";

export const NetworkErrorFinding = "NETWORK-ERROR";

export function networkAlert(
  err: Error,
  name: string,
  desc: string,
  blockNumber: number,
): Finding {
  return Finding.fromObject({
    name: name,
    description: desc,
    alertId: NetworkErrorFinding,
    severity: FindingSeverity.Unknown,
    type: FindingType.Degraded,
    metadata: {
      stack: `${err.stack}`,
      message: `${err.message}`,
      name: `${err.name}`,
    },
    uniqueKey: getUniqueKey(name, blockNumber),
  });
}

export function getUniqueKey(uniqueKey: string, blockNumber: number): string {
  return uniqueKey + "-" + blockNumber.toString();
}
