import {
  TREASURY_SWAP_EVENTS_OF_NOTICE as mainnetEventsOfNotice,
  ORDER_ADDRESS as mainnetOrderAddress,
} from "./constants";
import { ORDER_ADDRESS } from "../../common/constants.holesky";

const map: Record<string, string> = {
  [mainnetOrderAddress]: ORDER_ADDRESS,
};

export const TREASURY_SWAP_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: map[event.address] || event.address,
  }),
);
