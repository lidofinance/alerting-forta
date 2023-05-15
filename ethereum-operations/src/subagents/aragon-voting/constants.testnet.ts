import { ARAGON_VOTING_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";

export const LIDO_ARAGON_VOTING_ADDRESS =
  "0xbc0b67b4553f4cf52a913de9a6ed0057e2e758db";

export const ARAGON_VOTING_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => {
    return {
      ...event,
      address: LIDO_ARAGON_VOTING_ADDRESS,
    };
  }
);
