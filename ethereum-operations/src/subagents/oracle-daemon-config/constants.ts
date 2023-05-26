import { FindingSeverity } from "forta-agent";
import { ORACLE_DAEMON_CONFIG_ADDRESS as oracleConfigAddress } from "../../common/constants";

export const ORACLE_DAEMON_CONFIG_ADDRESS = oracleConfigAddress;

export const ORACLE_DAEMON_CONFIG_EVENTS_OF_NOTICE = [
  {
    address: ORACLE_DAEMON_CONFIG_ADDRESS,
    event: "event ConfigValueSet(string key, bytes value)",
    alertId: "ORACLE-DAEMON-CONFIG-VALUE-SET",
    name: "ℹ️ Oracle Daemon Config: new key:value pair was added",
    description: (args: any) => `${args.key}: ${args.value}`,
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
    description: (args: any) => `${args.key}: new value ${args.value}`,
    severity: FindingSeverity.High,
  },
];
