import { FindingSeverity } from "forta-agent";

export const LIDO_ARAGON_VOTING_ADDRESS =
  "0x2e59a20f205bb85a89c53f1936454680651e618e";
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
      `Aragon vote ${args.voteId} was started by ${args.creator}\nDetails:\n${args.metadata}`,
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
