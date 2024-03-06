import * as E from 'fp-ts/Either'
import { elapsedTime } from '../../utils/time'
import { Logger } from 'winston'
import { IAragonVotingClient, IVoteInfo } from './contract'
import { handleEventsOfNotice } from '../../utils/notice'

import { Block, BlockEvent, Finding, FindingSeverity, FindingType, TransactionEvent, TxEventBlock } from 'forta-agent'

import { ONE_HOUR } from 'constants/common'

import {
  ARAGON_VOTING_ADDRESS,
  PHASE_ONE_DURATION,
  TRIGGER_AFTER,
  FIVE_DAYS_BLOCKS,
  BLOCK_WINDOW,
} from 'constants/aragon-voting'

import { CAST_VOTE_EVENT, ARAGON_VOTING_EVENTS_OF_NOTICE } from '../../utils/events/aragon_events'

enum Outcomes {
  Pass = 'Pass',
  Fail = 'Fail',
}

export class AragonVotingSrv {
  private readonly logger: Logger
  private readonly name = 'AragonVotingSrv'
  private readonly ethProvider: IAragonVotingClient

  private initFindings: Finding[] = []
  private activeVotes: Map<number, IVoteInfo> = new Map<number, IVoteInfo>()
  private hasBlockWindow = true

  constructor(logger: Logger, ethProvider: IAragonVotingClient) {
    this.logger = logger
    this.ethProvider = ethProvider
  }

  public async initialize(currentBlock: number, hasBlockWindow = true): Promise<Error | null> {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))
    this.hasBlockWindow = hasBlockWindow
    const votes = await this.ethProvider.getStartedVotes(currentBlock - FIVE_DAYS_BLOCKS, currentBlock)

    if (E.isLeft(votes)) {
      return votes.left
    }

    this.activeVotes = votes.right
    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = [...this.initFindings]

    const proxyImplementationsFindings = await this.handleAragonBlock(blockEvent)

    findings.push(...proxyImplementationsFindings)

    this.logger.info(elapsedTime(AragonVotingSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleAragonBlock(blockEvent: BlockEvent) {
    if (blockEvent.blockNumber % BLOCK_WINDOW != 0 && this.hasBlockWindow) {
      return []
    }

    const results = await Promise.all(
      Array.from(this.activeVotes.keys()).map((voteId) => this.handleVoteInfo(voteId, blockEvent.block)),
    )

    const out: Finding[] = []
    results.map((result) => {
      if (result !== null) {
        out.push(result)
      }
    })
    return out
  }

  public getVoteOutcome(voteInfo: IVoteInfo): Outcomes {
    // quorum not reached
    if (voteInfo.yea.isLessThan(voteInfo.votingPower.times(voteInfo.minAcceptQuorum))) {
      return Outcomes.Fail
    }
    // it should be more than 50% yea votes
    if (voteInfo.yea.isLessThanOrEqualTo(voteInfo.nay.plus(voteInfo.yea).times(voteInfo.supportRequired))) {
      return Outcomes.Fail
    }
    return Outcomes.Pass
  }

  public async handleVoteInfo(voteId: number, block: Block | TxEventBlock): Promise<Finding | null> {
    const oldVoteInfo = this.activeVotes.get(voteId)
    const response = await this.ethProvider.getVote(voteId, block.number)
    if (E.isLeft(response)) {
      throw response.left
    }
    // delete vote form map if vote is closed
    const newVoteInfo = response.right
    if (!newVoteInfo.open) {
      this.activeVotes.delete(voteId)
    }

    this.activeVotes.set(voteId, newVoteInfo)

    if (!oldVoteInfo) {
      return null
    }

    const now = block.timestamp
    const oldOutcome = this.getVoteOutcome(oldVoteInfo)
    const newOutcome = this.getVoteOutcome(newVoteInfo)

    if (oldOutcome === newOutcome || newVoteInfo.startDate + TRIGGER_AFTER > now || newVoteInfo.phase !== 0) {
      return null
    }

    return Finding.fromObject({
      name: '⚠️ Expected vote outcome has changed',
      description:
        `Expected aragon vote ${voteId} outcome changed from '${oldOutcome}' to '${newOutcome}' and there is less than ` +
        `${Math.floor((PHASE_ONE_DURATION - TRIGGER_AFTER) / ONE_HOUR)}` +
        ` hour(s) left till the end of the first voting phase.`,
      alertId: 'ARAGON-VOTE-OUTCOME-CHANGED',
      severity: FindingSeverity.High,
      type: FindingType.Suspicious,
    })
  }

  public async handleTransaction(txEvent: TransactionEvent) {
    const findings: Finding[] = []
    const start = new Date().getTime()

    const [findingsAragonTransaction, findingsEventsOfNotice] = await Promise.all([
      this.handleAragonTransaction(txEvent),
      handleEventsOfNotice(txEvent, ARAGON_VOTING_EVENTS_OF_NOTICE),
    ])

    findings.push(...findingsAragonTransaction, ...findingsEventsOfNotice)
    this.logger.info(elapsedTime(AragonVotingSrv.name + '.' + this.handleTransaction.name, start))

    return findings
  }
  public async handleAragonTransaction(txEvent: TransactionEvent) {
    const out: Finding[] = []
    if (!txEvent.addresses[ARAGON_VOTING_ADDRESS]) {
      return out
    }
    const events = txEvent.filterLog(CAST_VOTE_EVENT, ARAGON_VOTING_ADDRESS)
    for (const event of events) {
      if (!event || !event.args.voteId) {
        continue
      }
      const result = await this.handleVoteInfo(event.args.voteId.toNumber(), txEvent.block)
      if (result) {
        out.push(result)
      }
    }
    return out
  }
}
