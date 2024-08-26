import { AragonVotingSrv, Outcomes } from './AragonVoting.srv'
import { BlockEvent, Finding, FindingSeverity, FindingType, LogDescription, TransactionEvent } from 'forta-agent'
import { Logger } from 'winston'
import { IAragonVotingClient, IVoteInfo } from './contract'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { BLOCK_WINDOW, TRIGGER_AFTER } from '../../shared/constants/aragon-voting/mainnet'
import { ARAGON_VOTING_ADDRESS } from '../../shared/constants/common/mainnet'
import { SIGNIFICANT_VP_AMOUNT } from '../../shared/constants'

describe('AragonVotingSrv', () => {
  let logger: Logger
  let ethProvider: IAragonVotingClient
  let aragonVotingSrv: AragonVotingSrv
  let blockEvent: BlockEvent
  let txEvent: TransactionEvent

  beforeEach(() => {
    logger = { info: jest.fn(), debug: jest.fn() } as unknown as Logger
    ethProvider = {
      getStartedVotes: jest.fn(),
      getVote: jest.fn(),
      getVotingPower: jest.fn(),
    } as unknown as IAragonVotingClient
    jest.spyOn(ethProvider, 'getStartedVotes').mockResolvedValue(E.right(new Map<number, IVoteInfo>()))
    aragonVotingSrv = new AragonVotingSrv(logger, ethProvider)
    blockEvent = { block: { number: 100, timestamp: 1000 } } as BlockEvent
    txEvent = {
      addresses: { '0x123': true },
      filterLog: jest.fn(),
      block: { number: 123 },
    } as unknown as TransactionEvent
  })

  it('initializes without error', () => {
    expect(() => aragonVotingSrv.initialize(100)).not.toThrow()
  })

  it('returns the correct name', () => {
    expect(aragonVotingSrv.getName()).toBe('AragonVotingSrv')
  })

  it.each([
    ['block number is outside the BLOCK_WINDOW', BLOCK_WINDOW * 2 + 1],
    ['block number is in the BLOCK_WINDOW', BLOCK_WINDOW * 3],
  ])('handles block without active votes: %s', async (title, blockNumber) => {
    blockEvent.block.number = blockNumber

    const findings = await aragonVotingSrv.handleBlock(blockEvent)

    expect(findings).toEqual([])
  })

  it('handles block with active votes', async () => {
    blockEvent.block.number = BLOCK_WINDOW * 5
    const startedVotes = new Map<number, IVoteInfo>([
      [
        1,
        {
          open: true,
          startDate: 1000,
          phase: 0,
          yea: BigNumber(50),
          nay: BigNumber(100),
          votingPower: BigNumber(200),
          minAcceptQuorum: 0.5,
          supportRequired: 0.5,
        } as IVoteInfo,
      ],
    ])
    jest.spyOn(ethProvider, 'getStartedVotes').mockResolvedValue(E.right(startedVotes))
    await aragonVotingSrv.initialize(blockEvent.block.number)
    jest.spyOn(ethProvider, 'getVote').mockResolvedValue(E.right(startedVotes.get(1) as IVoteInfo))
    jest.spyOn(aragonVotingSrv, 'handleVoteInfo').mockResolvedValue(null)

    const findings = await aragonVotingSrv.handleBlock(blockEvent)

    expect(findings).toEqual([])
  })

  it('handles transaction without errors', async () => {
    const findings = await aragonVotingSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
  })

  it('handles Aragon transaction without findings when no matching events', async () => {
    txEvent.addresses[ARAGON_VOTING_ADDRESS] = true
    jest.mocked(txEvent.filterLog).mockReturnValue([])

    const findings = await aragonVotingSrv.handleAragonTransaction(txEvent)

    expect(findings).toEqual([])
  })

  it('handles Aragon transaction with findings when matching events', async () => {
    txEvent.addresses[ARAGON_VOTING_ADDRESS] = true
    jest
      .mocked(txEvent.filterLog)
      .mockReturnValue([
        { args: { voteId: { toNumber: jest.fn().mockReturnValue(1) } } },
      ] as unknown as LogDescription[])
    jest.spyOn(aragonVotingSrv, 'handleVoteInfo').mockResolvedValue(
      Finding.fromObject({
        name: '⚠️ Expected vote outcome has changed',
        description: `Expected aragon vote 1 outcome changed from 'Fail' to 'Pass' and there is less than 2 hour(s) left till the end of the first voting phase.`,
        alertId: 'ARAGON-VOTE-OUTCOME-CHANGED',
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      }),
    )

    const findings = await aragonVotingSrv.handleAragonTransaction(txEvent)

    expect(findings).toHaveLength(1)
    expect(findings[0].name).toBe('⚠️ Expected vote outcome has changed')
  })

  it.each([
    [
      'returns finding when vote outcome changed',
      true,
      Finding.fromObject({
        name: '⚠️ Expected vote outcome has changed',
        description: `Expected aragon vote 1 outcome changed from 'Fail' to 'Pass' and there is less than 2 hour(s) left till the end of the first voting phase.`,
        alertId: 'ARAGON-VOTE-OUTCOME-CHANGED',
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      }),
    ],
    ['returns null when vote outcome not changed', false, null],
  ])('handles vote info and %s', async (title, changed, expected) => {
    blockEvent.block.timestamp = blockEvent.block.timestamp + TRIGGER_AFTER * 2
    jest.spyOn(ethProvider, 'getVote').mockResolvedValue(
      E.right({
        open: true,
        startDate: 1000,
        phase: 0,
        yea: BigNumber(50),
        nay: BigNumber(100),
        votingPower: BigNumber(200),
        minAcceptQuorum: 0.5,
        supportRequired: 0.5,
      } as unknown as IVoteInfo),
    )
    await aragonVotingSrv.handleVoteInfo(1, blockEvent.block)
    jest.spyOn(ethProvider, 'getVote').mockResolvedValue(
      E.right({
        open: true,
        startDate: 1000,
        phase: 0,
        yea: changed ? BigNumber(500) : BigNumber(50),
        nay: BigNumber(100),
        votingPower: BigNumber(200),
        minAcceptQuorum: 0.5,
        supportRequired: 0.5,
      } as unknown as IVoteInfo),
    )
    const findings = await aragonVotingSrv.handleVoteInfo(1, blockEvent.block)

    expect(findings).toEqual(expected)
  })

  it('returns Pass when vote outcome is pass', () => {
    const voteInfo = {
      open: true,
      startDate: 1000,
      phase: 0,
      yea: BigNumber(60),
      nay: BigNumber(40),
      votingPower: BigNumber(100),
      minAcceptQuorum: 0.5,
      supportRequired: 0.5,
    } as IVoteInfo

    const outcome = aragonVotingSrv.getVoteOutcome(voteInfo)

    expect(outcome).toBe(Outcomes.Pass)
  })

  it('returns Fail when vote outcome is fail due to less yea votes than required support', () => {
    const voteInfo = {
      open: true,
      startDate: 1000,
      phase: 0,
      yea: BigNumber(40),
      nay: BigNumber(60),
      votingPower: BigNumber(100),
      minAcceptQuorum: 0.3,
      supportRequired: 0.5,
    } as IVoteInfo

    const outcome = aragonVotingSrv.getVoteOutcome(voteInfo)

    expect(outcome).toBe(Outcomes.Fail)
  })

  it('returns Fail when vote outcome is fail due to quorum not reached', () => {
    const voteInfo = {
      open: true,
      startDate: 1000,
      phase: 0,
      yea: BigNumber(40),
      nay: BigNumber(60),
      votingPower: BigNumber(100),
      minAcceptQuorum: 0.6,
      supportRequired: 0.5,
    } as IVoteInfo

    const outcome = aragonVotingSrv.getVoteOutcome(voteInfo)

    expect(outcome).toBe(Outcomes.Fail)
  })

  it('handles assignDelegate transaction without findings when no matching events', async () => {
    txEvent.addresses[ARAGON_VOTING_ADDRESS] = true
    jest.mocked(txEvent.filterLog).mockReturnValue([])

    const findings = await aragonVotingSrv.handleAssignDelegateTransaction(txEvent)

    expect(findings).toEqual([])
  })

  it('handles assignDelegate transaction with findings when matching events', async () => {
    txEvent.addresses[ARAGON_VOTING_ADDRESS] = true
    jest.spyOn(ethProvider, 'getVotingPower').mockResolvedValue(E.right(SIGNIFICANT_VP_AMOUNT))
    jest
      .mocked(txEvent.filterLog)
      .mockReturnValue([{ args: { voter: '0x123', assignedDelegate: '0x345' } }] as unknown as LogDescription[])

    const findings = await aragonVotingSrv.handleAssignDelegateTransaction(txEvent)

    expect(findings).toHaveLength(1)
    expect(findings[0].name).toBe('ℹ️ Significant amount of LDO was delegated at once')
  })
})
