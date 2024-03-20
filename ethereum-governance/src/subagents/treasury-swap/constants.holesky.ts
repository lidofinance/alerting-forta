import {
  TREASURY_SWAP_EVENTS_OF_NOTICE as mainnetEventsOfNotice,
  STONKS_ADDRESS as mainnetStonksAddress,
  ORDER_ADDRESS as mainnetOrderAddress
} from "./constants";
import {
  STONKS_ADDRESS,
  ORDER_ADDRESS,
} from "../../common/constants.holesky";

const map:Record<string, string> = {
  [mainnetStonksAddress]: STONKS_ADDRESS,
  [mainnetOrderAddress]: ORDER_ADDRESS,
}

export const TREASURY_SWAP_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: map[event.address],
  }),
);
