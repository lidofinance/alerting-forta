import { STAKING_ROUTER_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";
import { STAKING_ROUTER_ADDRESS as srAddress } from "../../common/constants.holesky";

export const STAKING_ROUTER_ADDRESS = srAddress;

export const STAKING_ROUTER_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: STAKING_ROUTER_ADDRESS,
  }),
);
