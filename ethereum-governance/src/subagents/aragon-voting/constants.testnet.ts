import { ARAGON_VOTING_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";
import { ARAGON_VOTING_ADDRESS as votingAddress } from "../../common/constants.testnet";

export const ARAGON_VOTING_ADDRESS = votingAddress;

export const ARAGON_VOTING_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => {
    return {
      ...event,
      address: ARAGON_VOTING_ADDRESS,
    };
  },
);
