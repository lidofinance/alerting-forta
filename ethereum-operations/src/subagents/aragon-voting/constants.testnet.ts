import { ONE_HOUR } from "../../common/constants";
import { ARAGON_VOTING_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";

// Perform ad-hoc votes info refresh each BLOCK_WINDOW blocks
export const BLOCK_WINDOW = 1000;

// Number of blocks for the whole 5 days
export const FIVE_DAYS_BLOCKS = Math.floor((ONE_HOUR * 24 * 5) / 12);

// 46 hours
export const TRIGGER_AFTER = 46 * ONE_HOUR;

// 48 hours
export const PHASE_ONE_DURATION = 48 * ONE_HOUR;

export const LIDO_ARAGON_VOTING_ADDRESS =
  "0xbc0b67b4553f4cf52a913de9a6ed0057e2e758db";
export const CAST_VOTE_EVENT =
  "event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake)";

export const ARAGON_VOTING_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => {
    return {
      ...event,
      address: LIDO_ARAGON_VOTING_ADDRESS,
    };
  }
);
