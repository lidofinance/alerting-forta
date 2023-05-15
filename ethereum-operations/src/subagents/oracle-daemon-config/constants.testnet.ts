import { ORACLE_DAEMON_CONFIG_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";

export const ORACLE_DAEMON_CONFIG_ADDRESS =
  "0xe9cc5bd91543cdc9788454ee5063e2cd76b5206d";

export const ORACLE_DAEMON_CONFIG_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: ORACLE_DAEMON_CONFIG_ADDRESS,
  })
);
