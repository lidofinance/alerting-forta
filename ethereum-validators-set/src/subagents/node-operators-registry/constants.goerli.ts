import { CURATED_NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE as mainnetCuratedEventsOfNotice } from "./constants";
import {
  EASY_TRACK_ADDRESS as etAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
} from "../../common/constants.goerli";

export const EASY_TRACK_ADDRESS = etAddress;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;

export const NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD = 1;
export const NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD = 5;

export const CURATED_NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE =
  mainnetCuratedEventsOfNotice.map((event) => ({
    ...event,
    address: CURATED_NODE_OPERATORS_REGISTRY_ADDRESS,
  }));
