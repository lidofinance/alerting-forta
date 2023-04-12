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

import { ethersProvider } from "../../ethers";

import ARAGON_VOTING_ABI from "../../abi/AragonVoting.json";
import { ETH_DECIMALS, ONE_HOUR } from "../../common/constants";

import { handleEventsOfNotice, requireConstants } from "../../common/utils";

import * as _constants from "./constants";

export const name = "Aragon Voting Watcher";

export let constants: typeof _constants;
try {
  constants = requireConstants(`${module.path}/constants`);
} catch (e: any) {
  if (e?.code == "MODULE_NOT_FOUND") {
    // Do nothing. `constants` will be undefined and sub-agent will be disabled
  } else {
    throw e;
  }
}

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
    constants.LIDO_ARAGON_VOTING_ADDRESS,
    ARAGON_VOTING_ABI,
    ethersProvider
  );
  const filterStartVote = aragonVoting.filters.StartVote();
  const startedVotes = (
    await aragonVoting.queryFilter(
      filterStartVote,
      currentBlock - constants.FIVE_DAYS_BLOCKS,
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
  if (blockEvent.blockNumber % constants.BLOCK_WINDOW == 0) {
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
    constants.LIDO_ARAGON_VOTING_ADDRESS,
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
    phase: voteInfoRaw.phase,
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
      newVoteInfo.startDate + constants.TRIGGER_AFTER < now &&
      newVoteInfo.phase == 0
    ) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Expected vote outcome has changed",
          description:
            `Expected aragon vote ${voteId} outcome changed from '${oldOutcome}' to '${newOutcome}' and there is less than ` +
            `${Math.floor(
              (constants.PHASE_ONE_DURATION - constants.TRIGGER_AFTER) /
                ONE_HOUR
            )}` +
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
    handleEventsOfNotice(
      txEvent,
      findings,
      constants.ARAGON_VOTING_EVENTS_OF_NOTICE
    ),
  ]);

  return findings;
}

async function handleAragonTransaction(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (constants.LIDO_ARAGON_VOTING_ADDRESS in txEvent.addresses) {
    const events = txEvent.filterLog(
      constants.CAST_VOTE_EVENT,
      constants.LIDO_ARAGON_VOTING_ADDRESS
    );
    for (const event of events) {
      if (event && event.args.voteId) {
        await handleNewVoteInfo(
          event.args.voteId.toNumber(),
          txEvent.block,
          findings
        );
      }
    }
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
