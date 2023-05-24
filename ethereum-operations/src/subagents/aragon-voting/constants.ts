import { FindingSeverity } from "forta-agent";
import { ONE_HOUR } from "../../common/constants";
import { etherscanAddress } from "../../common/utils";
import { LIDO_ARAGON_VOTING_ADDRESS as votingAddress } from "../../common/constants";

// Perform ad-hoc votes info refresh each BLOCK_WINDOW blocks
export const BLOCK_WINDOW = 1000;

// Number of blocks for the whole 5 days
export const FIVE_DAYS_BLOCKS = Math.floor((ONE_HOUR * 24 * 5) / 12);

// 46 hours
export const TRIGGER_AFTER = 46 * ONE_HOUR;

// 48 hours
export const PHASE_ONE_DURATION = 48 * ONE_HOUR;

export const LIDO_ARAGON_VOTING_ADDRESS = votingAddress;
export const CAST_VOTE_EVENT =
  "event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake)";

export const ARAGON_VOTING_EVENTS_OF_NOTICE = [
  {
    address: LIDO_ARAGON_VOTING_ADDRESS,
    event:
      "event StartVote(uint256 indexed voteId, address indexed creator, string metadata)",
    alertId: "ARAGON-VOTE-STARTED",
    name: "🚀 Aragon: Vote started",
    description: (args: any) =>
      `Aragon vote ${args.voteId} was started by ` +
      `${etherscanAddress(args.creator)}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_ARAGON_VOTING_ADDRESS,
    event: "event ExecuteVote(uint256 indexed voteId)",
    alertId: "ARAGON-VOTE-EXECUTED",
    name: "✅ Aragon: Vote executed",
    description: (args: any) => `Aragon vote ${args.voteId} was executed`,
    severity: FindingSeverity.Info,
  },
];
