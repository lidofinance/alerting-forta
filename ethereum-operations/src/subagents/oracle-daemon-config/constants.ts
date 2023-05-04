import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";

export const ORACLE_DAEMON_CONFIG_ADDRESS =
  "0xbf05a929c3d7885a6aead833a992da6e5ac23b09";

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
