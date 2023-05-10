import { STAKING_ROUTER_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";

export const STAKING_ROUTER_ADDRESS =
  "0xa3dbd317e53d363176359e10948ba0b1c0a4c820";

export const STAKING_ROUTER_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: STAKING_ROUTER_ADDRESS,
  })
);
