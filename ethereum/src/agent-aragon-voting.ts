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
import { LIDO_ARAGON_VOTING_ADDRESS, CAST_VOTE_EVENT } from "./constants";

export const name = "Aragon Voting Watcher";

// Perform ad-hoc votes info refresh each BLOCK_WINDOW blocks
const BLOCK_WINDOW = 1000;

// Number of blocks for the whole 5 days
const FIVE_DAYS_BLOCKS = Math.floor((60 * 60 * 24 * 5) / 13);

// 36 hours
const HALF_VOTING_TIME = 60 * 60 * 36;

interface IVoteInfo {
  startDate: number;
  open: boolean;
  yea: BigNumber;
  nay: BigNumber;
  votingPower: BigNumber;
}

enum SupportState {
  Undefined = "Undefined",
  For = "For",
  Against = "Against",
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
    const oldSupportState = getVoteSupportState(oldVoteInfo);
    const newSupportState = getVoteSupportState(newVoteInfo);
    if (
      oldSupportState != newSupportState &&
      oldSupportState != SupportState.Undefined &&
      newVoteInfo.startDate + HALF_VOTING_TIME < now
    ) {
      findings.push(
        Finding.fromObject({
          name: "Vote support state has changed",
          description:
            `Aragon vote ${voteId} support has changed from '${oldSupportState}' to '${newSupportState}' and there is more than ` +
            `${Math.floor(HALF_VOTING_TIME / (60 * 60))} hours ` +
            `past since vote start`,
          alertId: "ARAGON-VOTE-SUPPORT-STATE-CHANGED",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
    }
  }
  // update vote info
  votes.set(voteId, newVoteInfo);
}

function getVoteSupportState(voteInfo: IVoteInfo): SupportState {
  if (voteInfo.nay.isEqualTo(voteInfo.yea)) return SupportState.Undefined;
  if (voteInfo.nay.isGreaterThan(voteInfo.yea)) {
    return SupportState.Against;
  } else {
    return SupportState.For;
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await handleEasyTrackTransaction(txEvent, findings);

  return findings;
}

async function handleEasyTrackTransaction(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (LIDO_ARAGON_VOTING_ADDRESS in txEvent.addresses) {
    const [event] = txEvent.filterLog(
      CAST_VOTE_EVENT,
      LIDO_ARAGON_VOTING_ADDRESS
    );
    if (event && event.args.voteId) {
      await handleNewVoteInfo(event.args.voteId.toNumber(), txEvent.block, findings);
    }
  }
}
