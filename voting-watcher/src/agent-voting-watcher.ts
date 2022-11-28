import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import VOTING_ABI from "./abi/AragonVoting.json";

import {
  ARAGON_VOTING_EVENTS_OF_NOTICE,
  ETH_DECIMALS,
  HUGE_VOTE_DISTANCE,
  LIDO_VOTING_ADDRESS,
  VOTING_BASE_URL,
  PINGER_SCHEDULE,
} from "./constants";

import { ethersProvider } from "./ethers";
import {
  formatLink,
  getResultStr,
  abbreviateNumber,
  secondsToDaysAndHours,
} from "./helpers";

interface VoteInfo {
  open: boolean;
  executed: boolean;
  startDate: number;
  supportRequired: BigNumber;
  minAcceptQuorum: BigNumber;
  yea: BigNumber;
  nay: BigNumber;
  votingPower: BigNumber;
  phase: number;
  url: string;
  total: BigNumber;
  pro: number;
  contra: number;
  passed: boolean;
  quorumDistance: number;
  timeLeft: number;
  resultsStr: string;
  lastReportedTotal?: BigNumber;
  alertLevel?: number;
  noMorePing?: boolean;
}

let activeVotes: Map<number, VoteInfo> = new Map<number, VoteInfo>();
let voteLength: number;
let objectionsTime: number;

export const name = "VotingWatcher";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  activeVotes = await getActiveVotes(currentBlock, true);

  return {
    activeVotes: Array.from(activeVotes.keys()).toString(),
  };
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await handleActiveVotes(blockEvent, findings);
  await handlePinger(blockEvent, findings);
  await handleHugeVotes(blockEvent, findings);

  return findings;
}

async function handleActiveVotes(blockEvent: BlockEvent, findings: Finding[]) {
  await updateVotingDurations(blockEvent.blockNumber);
  const newActiveVotes = await getActiveVotes(blockEvent.blockNumber);
  new Set([
    ...Array.from(activeVotes.keys()),
    ...Array.from(newActiveVotes.keys()),
  ]).forEach((key) => {
    const updated = newActiveVotes.get(key);
    const old = activeVotes.get(key);
    if (updated && old) {
      let keep = true;
      const { passed, url, pro, contra, resultsStr, timeLeft } = updated;
      const alertLevel = old.alertLevel || 0;
      if (alertLevel < 3 && !updated.open) {
        const text =
          `${formatLink(`Voting #${key}`, url)} is over 🏁 ${
            passed ? "and passed, phew! 👍" : "but rejected 😔"
          } ` + `(${pro} pro, ${contra} contra, ${resultsStr})`;
        voteStateChanged(text, findings);
        keep = false;
      } else if (alertLevel < 2 && timeLeft < 3600 * 4 && updated.phase == 1) {
        const text =
          `Final note 🔔, less than 4 hours left till the end of the objection phase for ` +
          `${formatLink(`voting #${key}`, url)} ` +
          `(${pro} pro, ${contra} contra, ${resultsStr})`;
        updated.alertLevel = 2;
        voteStateChanged(text, findings);
      } else if (old.phase == 1 && updated.phase == 2) {
        const text =
          `Hi there 👋, objection phase 🙅‍♂️ started for ` +
          `${formatLink(`voting #${key}`, url)} ` +
          `(${pro} pro, ${contra} contra, ${resultsStr})`;
        voteStateChanged(text, findings);
        updated.alertLevel = 1;
      }
      if (keep) {
        activeVotes.set(key, mergeVotesInfo(old, updated));
      } else {
        activeVotes.delete(key);
      }
    } else if (updated) {
      activeVotes.set(key, updated);
    } else {
      activeVotes.delete(key);
    }
  });
}

async function handleHugeVotes(blockEvent: BlockEvent, findings: Finding[]) {
  Array.from(activeVotes.keys()).forEach((key) => {
    const vote = activeVotes.get(key);
    if (vote) {
      const total = vote.yea.plus(vote.nay);
      const lastTotal = vote.lastReportedTotal || new BigNumber(0);
      const url = `${VOTING_BASE_URL}${key}`;
      if (total.gte(lastTotal.plus(HUGE_VOTE_DISTANCE)) && !vote.noMorePing) {
        if (vote.passed) {
          hugeVotesWithQuorum(total.minus(lastTotal), key, vote, findings);
          vote.noMorePing = true;
        } else {
          hugeVotes(total.minus(lastTotal), key, vote, findings);
        }
        vote.lastReportedTotal = total;
        activeVotes.set(key, vote);
      }
    }
  });
}

async function handlePinger(blockEvent: BlockEvent, findings: Finding[]) {
  const prevBlock = await ethersProvider.getBlock(blockEvent.blockNumber - 1);
  Array.from(activeVotes.keys()).forEach(async (key) => {
    const vote = activeVotes.get(key);
    if (vote) {
      PINGER_SCHEDULE.forEach(async (time) => {
        const pingTime = vote.startDate + voteLength - time * 3600;
        if (
          pingTime <= blockEvent.block.timestamp &&
          pingTime > prevBlock.timestamp
        ) {
          votePing(key, vote, findings);
        }
      });
    }
  });
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleAragonEventsOfNoticeTransaction(txEvent, findings);

  return findings;
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

async function updateVotingDurations(block: number) {
  const blockTag = { blockTag: block };
  const voting = new ethers.Contract(
    LIDO_VOTING_ADDRESS,
    VOTING_ABI,
    ethersProvider
  );
  await Promise.all([
    async () => {
      voteLength = await voting.functions.voteTime(blockTag);
    },
    async () => {
      objectionsTime = await voting.functions.objectionPhaseTime(blockTag);
    },
  ]);
}

async function getActiveVotes(
  block: number,
  init: boolean = false
): Promise<Map<number, VoteInfo>> {
  const blockTag = { blockTag: block };
  const voting = new ethers.Contract(
    LIDO_VOTING_ADDRESS,
    VOTING_ABI,
    ethersProvider
  );
  const votesInfo = new Map<number, VoteInfo>();
  const votesLength = await voting.functions.votesLength(blockTag);
  for (let i = votesLength - 1; i > 0; i--) {
    const vote = await voting.functions.getVote(i, blockTag);
    if (!vote.open) {
      break;
    }
    const supportRequired = new BigNumber(String(vote.supportRequired));
    const minAcceptQuorum = new BigNumber(String(vote.minAcceptQuorum));
    const yea = new BigNumber(String(vote.yea));
    const nay = new BigNumber(String(vote.nay));
    const votingPower = new BigNumber(String(vote.votingPower));
    const total = yea.plus(nay);
    const pro = yea.times(1000).div(votingPower).toNumber() / 10;
    const contra = nay.times(1000).div(votingPower).toNumber() / 10;
    const quorumDistance =
      Math.round(
        minAcceptQuorum
          .minus(yea.times(ETH_DECIMALS).div(votingPower))
          .times(100000)
          .div(ETH_DECIMALS)
          .toNumber() / 100
      ) / 10;
    const passed =
      yea.gte(votingPower.times(minAcceptQuorum).div(ETH_DECIMALS)) &&
      yea.gte(total.times(supportRequired).div(ETH_DECIMALS));
    const timeLeft = vote.startDate.toNumber() + voteLength - block;
    const resultsStr = getResultStr(quorumDistance, passed);
    const voteInfo: VoteInfo = {
      open: vote.open,
      executed: vote.executed,
      startDate: vote.startDate.toNumber(),
      phase: vote.phase,
      url: `${VOTING_BASE_URL}${i}`,
      supportRequired,
      minAcceptQuorum,
      yea,
      nay,
      votingPower,
      total,
      pro,
      contra,
      quorumDistance,
      passed,
      timeLeft,
      resultsStr,
    };
    if (init) {
      voteInfo.lastReportedTotal = total;
    }
    votesInfo.set(i, voteInfo);
  }
  return votesInfo;
}

function mergeVotesInfo(target: VoteInfo, source: VoteInfo): VoteInfo {
  return {
    ...target,
    ...source,
  };
}

function voteStateChanged(text: string, findings: Finding[]) {
  findings.push(
    Finding.fromObject({
      name: "Vote state changed",
      description: text,
      alertId: "VOTE-STATE-CHANGED",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })
  );
}

function hugeVotes(
  votesDiff: BigNumber,
  id: number,
  vote: VoteInfo,
  findings: Finding[]
) {
  findings.push(
    Finding.fromObject({
      name: "Huge votes",
      description:
        `${abbreviateNumber(votesDiff.div(ETH_DECIMALS).toNumber())} ` +
        `voted on ${formatLink(`#${id}`, vote.url)}. ` +
        `${vote.quorumDistance}% still required`,
      alertId: "HUGE-VOTES",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })
  );
}

function hugeVotesWithQuorum(
  votesDiff: BigNumber,
  id: number,
  vote: VoteInfo,
  findings: Finding[]
) {
  findings.push(
    Finding.fromObject({
      name: "Huge votes",
      description:
        `${abbreviateNumber(votesDiff.div(ETH_DECIMALS).toNumber())} ` +
        `voted on ${formatLink(`#${id}`, vote.url)}. ` +
        `And quorum has been reached! 🎉🎉🎉`,
      alertId: "HUGE-VOTES",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })
  );
}

function votePing(id: number, vote: VoteInfo, findings: Finding[]) {
  findings.push(
    Finding.fromObject({
      name: "Time to vote",
      description:
        `${vote.quorumDistance}% still required for ` +
        `${formatLink(`#${id}`, vote.url)}. ` +
        `${secondsToDaysAndHours(vote.timeLeft - objectionsTime)} ` +
        `till the end on Main phase`,
      alertId: "VOTE-PING",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })
  );
}
