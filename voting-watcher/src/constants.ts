import BigNumber from "bignumber.js";
import { FindingSeverity } from "forta-agent";
import { formatLink } from "./helpers";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export const VOTING_BASE_URL = "https://vote.lido.fi/vote/";

export const PINGER_SCHEDULE = [45, 30, 27, 24, 21, 7, 5, 3, 2, 1];
export const HUGE_VOTE_DISTANCE = ETH_DECIMALS.times(100_000);

// ADDRESSES AND EVENTS

export const LIDO_VOTING_ADDRESS = "0x2e59a20f205bb85a89c53f1936454680651e618e"; // should be lowercase

export const SUBMITTED_EVENT =
  "event Submitted(address indexed sender, uint256 amount, address referral)";

export const ARAGON_VOTING_EVENTS_OF_NOTICE = [
  {
    address: LIDO_VOTING_ADDRESS,
    event:
      "event StartVote(uint256 indexed voteId, address indexed creator, string metadata)",
    alertId: "VOTE-STATE-CHANGED",
    name: "🚀 Aragon: Vote started",
    description: (args: any) =>
      `New ${formatLink(
        `voting #${args.voteId}}`,
        `${VOTING_BASE_URL}${args.voteId}`
      )} started 🚀\n Subject: ${args.metadata}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_VOTING_ADDRESS,
    event: "event ExecuteVote(uint256 indexed voteId)",
    alertId: "VOTE-STATE-CHANGED",
    name: "✅ Aragon: Vote executed",
    description: (args: any) =>
      `${formatLink(
        `Voting #${args.voteId}}`,
        `${VOTING_BASE_URL}${args.voteId}`
      )} was executed`,
    severity: FindingSeverity.Info,
  },
];
