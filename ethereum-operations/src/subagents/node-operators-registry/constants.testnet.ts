import { NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";
import {
  EASY_TRACK_ADDRESS as etAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
} from "../../common/constants";

export const EASY_TRACK_ADDRESS = etAddress;
export const NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;

export const NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD = 1;
export const NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD = 5;

export const NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE =
  mainnetEventsOfNotice.map((event) => ({
    ...event,
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
  }));
