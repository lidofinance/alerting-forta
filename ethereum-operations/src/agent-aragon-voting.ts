import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
  Block,
  TxEventBlock,
} from "forta-agent";

import { ethersProvider } from "./ethers";

import ARAGON_VOTING_ABI from "./abi/AragonVoting.json";
import {
  LIDO_ARAGON_VOTING_ADDRESS,
  CAST_VOTE_EVENT,
  ETH_DECIMALS,
  ARAGON_VOTING_EVENTS_OF_NOTICE,
  ONE_HOUR,
} from "./constants";

export const name = "Aragon Voting Watcher";

// Perform ad-hoc votes info refresh each BLOCK_WINDOW blocks
const BLOCK_WINDOW = 1000;

// Number of blocks for the whole 5 days
const FIVE_DAYS_BLOCKS = Math.floor((ONE_HOUR * 24 * 5) / 13);

// 47 hours
const TRIGGER_AFTER = 46 * ONE_HOUR;

// 48 hours
const PHASE_ONE_DURATION = 48 * ONE_HOUR;

interface IVoteInfo {
  startDate: number;
  open: boolean;
  yea: BigNumber;
  nay: BigNumber;
  votingPower: BigNumber;
  supportRequired: number;
  minAcceptQuorum: number;
  phase: number;
}

enum Outcomes {
  Pass = "Pass",
  Fail = "Fail",
}

let votes = new Map<number, IVoteInfo>();

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const aragonVoting = new ethers.Contract(
    LIDO_ARAGON_VOTING_ADDRESS,
    ARAGON_VOTING_ABI,
    ethersProvider
  );
  const filterStartVote = aragonVoting.filters.StartVote();
  const startedVotes = (
    await aragonVoting.queryFilter(
      filterStartVote,
      currentBlock - FIVE_DAYS_BLOCKS,
      currentBlock
    )
  ).map((value: any) => parseInt(String(value.args.voteId)));

  await Promise.all(
    startedVotes.map(async (voteId: number) => {
      const voteInfo = await getVoteInfo(voteId, currentBlock);
      if (voteInfo.open) {
        votes.set(voteId, voteInfo);
      }
    })
  );
  return { activeVotes: `${Array.from(votes.keys())}` };
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([adHocVotesRefresh(blockEvent, findings)]);

  return findings;
}

async function adHocVotesRefresh(blockEvent: BlockEvent, findings: Finding[]) {
  if (blockEvent.blockNumber % BLOCK_WINDOW == 0) {
    await Promise.all(
      Array.from(votes.keys()).map(async (voteId: number) => {
        await handleNewVoteInfo(voteId, blockEvent.block, findings);
      })
    );
  }
}

async function getVoteInfo(
  voteId: number,
  blockNumber: number
): Promise<IVoteInfo> {
  const aragonVoting = new ethers.Contract(
    LIDO_ARAGON_VOTING_ADDRESS,
    ARAGON_VOTING_ABI,
    ethersProvider
  );
  const voteInfoRaw = await aragonVoting.functions.getVote(voteId, {
    blockTag: blockNumber,
  });
  return {
    startDate: voteInfoRaw.startDate.toNumber(),
    open: voteInfoRaw.open,
    yea: new BigNumber(String(voteInfoRaw.yea)),
    nay: new BigNumber(String(voteInfoRaw.nay)),
    votingPower: new BigNumber(String(voteInfoRaw.votingPower)),
    supportRequired: new BigNumber(String(voteInfoRaw.supportRequired))
      .div(ETH_DECIMALS)
      .toNumber(),
    minAcceptQuorum: new BigNumber(String(voteInfoRaw.minAcceptQuorum))
      .div(ETH_DECIMALS)
      .toNumber(),
    phase: voteInfoRaw.phase.toNumber(),
  };
}

async function handleNewVoteInfo(
  voteId: number,
  block: Block | TxEventBlock,
  findings: Finding[]
) {
  const oldVoteInfo = votes.get(voteId);
  const newVoteInfo = await getVoteInfo(voteId, block.number);
  // delete vote form map if vote is closed
  if (!newVoteInfo.open) {
    votes.delete(voteId);
  }
  if (oldVoteInfo) {
    const now = block.timestamp;
    const oldOutcome = getVoteOutcome(oldVoteInfo);
    const newOutcome = getVoteOutcome(newVoteInfo);
    if (
      oldOutcome != newOutcome &&
      newVoteInfo.startDate + TRIGGER_AFTER < now &&
      newVoteInfo.phase == 0
    ) {
      findings.push(
        Finding.fromObject({
          name: "Expected vote outcome has changed",
          description:
            `Expected aragon vote ${voteId} outcome changed from '${oldOutcome}' to '${newOutcome}' and there is less than ` +
            `${Math.floor((PHASE_ONE_DURATION - TRIGGER_AFTER) / ONE_HOUR)}` +
            ` hour(s) left till the end of the first voting phase.`,
          alertId: "ARAGON-VOTE-OUTCOME-CHANGED",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
    }
  }
  // update vote info
  votes.set(voteId, newVoteInfo);
}

function getVoteOutcome(voteInfo: IVoteInfo): Outcomes {
  // quorum not reached
  if (
    voteInfo.yea.isLessThan(
      voteInfo.votingPower.times(voteInfo.minAcceptQuorum)
    )
  ) {
    return Outcomes.Fail;
  }
  // it should be more than 50% yea votes
  if (
    voteInfo.yea.isLessThanOrEqualTo(
      voteInfo.nay.plus(voteInfo.yea).times(voteInfo.supportRequired)
    )
  ) {
    return Outcomes.Fail;
  }
  return Outcomes.Pass;
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleAragonTransaction(txEvent, findings),
    handleAragonEventsOfNoticeTransaction(txEvent, findings),
  ]);

  return findings;
}

async function handleAragonTransaction(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (LIDO_ARAGON_VOTING_ADDRESS in txEvent.addresses) {
    const [event] = txEvent.filterLog(
      CAST_VOTE_EVENT,
      LIDO_ARAGON_VOTING_ADDRESS
    );
    if (event && event.args.voteId) {
      await handleNewVoteInfo(
        event.args.voteId.toNumber(),
        txEvent.block,
        findings
      );
    }
  }
}

function handleAragonEventsOfNoticeTransaction(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  ARAGON_VOTING_EVENTS_OF_NOTICE.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const [event] = txEvent.filterLog(eventInfo.event, eventInfo.address);
      if (event) {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          })
        );
      }
    }
  });
}
