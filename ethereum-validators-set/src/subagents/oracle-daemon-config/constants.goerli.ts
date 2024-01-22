import { ORACLE_DAEMON_CONFIG_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";
import { ORACLE_DAEMON_CONFIG_ADDRESS as oracleConfigAddress } from "../../common/constants.goerli";

export const ORACLE_DAEMON_CONFIG_ADDRESS = oracleConfigAddress;

export const ORACLE_DAEMON_CONFIG_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: ORACLE_DAEMON_CONFIG_ADDRESS,
  }),
);
