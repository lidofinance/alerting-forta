import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";

export const ORACLE_DAEMON_CONFIG_ADDRESS =
  "0xe9cc5bd91543cdc9788454ee5063e2cd76b5206d";

export const ORACLE_DAEMON_CONFIG_EVENTS_OF_NOTICE = [
  {
    address: ORACLE_DAEMON_CONFIG_ADDRESS,
    event: "event ConfigValueSet(string key, bytes value)",
    alertId: "ORACLE-DAEMON-CONFIG-VALUE-SET",
    name: "ℹ️ Oracle Daemon Config: new key:value pair was added",
    description: (args: any) => `${args.key}: ${new BigNumber(args.value)}`,
    severity: FindingSeverity.High,
  },
  {
    address: ORACLE_DAEMON_CONFIG_ADDRESS,
    event: "event ConfigValueUnset(string key)",
    alertId: "ORACLE-DAEMON-CONFIG-VALUE-UNSET",
    name: "⚠️ Oracle Daemon Config: key was removed",
    description: (args: any) => args.key,
    severity: FindingSeverity.High,
  },
  {
    address: ORACLE_DAEMON_CONFIG_ADDRESS,
    event: "event ConfigValueUpdated(string key, bytes value)",
    alertId: "ORACLE-DAEMON-CONFIG-VALUE-UPDATED",
    name: "⚠️ Oracle Daemon Config: value of key was updated",
    description: (args: any) =>
      `${args.key}: new value ${new BigNumber(args.value)}`,
    severity: FindingSeverity.High,
  },
];
