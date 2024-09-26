import { elapsedTime } from '../../utils/time'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { ethers, filterLog, getEthersProvider } from 'forta-agent'
import { APPROVAL_EVENT } from '../../utils/events/cs_accounting_events'
import CS_MODULE_ABI from '../../brief/abi/CSModule.json'
import CS_ACCOUNTING_ABI from '../../brief/abi/CSAccounting.json'
import { getLogsByChunks } from '../../utils/utils'
import { Config } from '../../utils/env/env'
import { AVERAGE_BOND_TRESHOLD, ONE_DAY, UNBONDED_KEYS_TRESHOLD } from '../../utils/constants'

export abstract class ICSAccountingClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class CSAccountingSrv {
  private readonly name = 'CSAccountingSrv'
  private readonly logger: Logger
  private readonly csAccountingClient: ICSAccountingClient

  private readonly csAccountingEvents: EventOfNotice[]
  private readonly csAccountingAddress: string
  private readonly stETHAddress: string
  private readonly csModuleAddress: string

  private nodeOperatorAddedEvents: ethers.Event[] = []
  private lastAverageBondValueAlertTimestamp: number = 0

  constructor(
    logger: Logger,
    ethProvider: ICSAccountingClient,
    csAccountingEvents: EventOfNotice[],
    csAccountingAddress: string,
    stETHAddress: string,
    csModuleAddress: string,
  ) {
    this.logger = logger
    this.csAccountingClient = ethProvider

    this.csAccountingEvents = csAccountingEvents
    this.csAccountingAddress = csAccountingAddress
    this.stETHAddress = stETHAddress
    this.csModuleAddress = csModuleAddress
  }

  public async initialize(currentBlock: number): Promise<Finding[] | Error | null> {
    const start = new Date().getTime()

    const config = new Config()

    const currBlock = await this.csAccountingClient.getBlockByNumber(currentBlock)
    if (E.isLeft(currBlock)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return currBlock.left
    }

    const csModule = new ethers.Contract(this.csModuleAddress, CS_MODULE_ABI, getEthersProvider())
    const startBlock = config.csModuleInitBlock
    const csModuleNodeOperatorAddedFilter = csModule.filters.NodeOperatorAdded()
    this.nodeOperatorAddedEvents = await getLogsByChunks(
      csModule,
      csModuleNodeOperatorAddedFilter,
      startBlock,
      currentBlock,
    )

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  async handleBlock(blockDto: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const averageBondValueFindings = this.handleAverageBondValue(blockDto)
    const unbondedValidatorsFindings = this.handleUnbondedValidators(blockDto)

    findings.push(...averageBondValueFindings, ...unbondedValidatorsFindings)

    this.logger.info(elapsedTime(CSAccountingSrv.name + '.' + this.handleBlock.name, start))
    this.logger.info(blockDto.timestamp)

    return findings
  }

  public handleAverageBondValue(blockDto: BlockDto): Finding[] {
    const out: Finding[] = []
    const now = blockDto.timestamp

    const csAccounting = new ethers.Contract(this.csAccountingAddress, CS_ACCOUNTING_ABI, getEthersProvider())
    let bondValueTotal = 0

    this.nodeOperatorAddedEvents.forEach(async (event) => {
      const noId = event.args?.nodeOperatorId
      const bondValue = await csAccounting.getBondSummary(noId).current
      bondValueTotal += bondValue
    })
    const averageBondValue = bondValueTotal / this.nodeOperatorAddedEvents.length

    const timeSinceLastAlert = now - this.lastAverageBondValueAlertTimestamp

    if (timeSinceLastAlert > ONE_DAY) {
      if (averageBondValue >= AVERAGE_BOND_TRESHOLD) {
        const f: Finding = new Finding()
        f.setName(`🟢 CSAccounting: Average bond value for a validator is below threshold.`)
        f.setDescription(`Average bond value for a validator is below ${AVERAGE_BOND_TRESHOLD}`)
        f.setAlertid('CS-ACCOUNTING-AVERAGE-BOND-VALUE')
        f.setSeverity(Finding.Severity.LOW)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)

        this.lastAverageBondValueAlertTimestamp = now
      }

      // * unfinished implementation
      const totalBondLock = bondValueTotal
      const SOME_VALUE = 1000 // ! Replace with actual value
      if (totalBondLock > SOME_VALUE) {
        const f: Finding = new Finding()
        f.setName(`🟢 LOW: Total bond lock exceeds threshold.`)
        f.setDescription(`Total bond lock is more than ${SOME_VALUE}`)
        f.setAlertid('CS-ACCOUNTING-TOTAL-BOND-LOCK')
        f.setSeverity(Finding.Severity.LOW)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      }
    }

    return out
  }

  public handleUnbondedValidators(blockDto: BlockDto): Finding[] {
    const out: Finding[] = []

    const csAccounting = new ethers.Contract(this.csAccountingAddress, CS_ACCOUNTING_ABI, getEthersProvider())

    this.nodeOperatorAddedEvents.forEach(async (event) => {
      const noId = event.args?.nodeOperatorId
      const unbondedKeysCount = await csAccounting.getUnbondedKeysCount(noId)
      if (unbondedKeysCount >= UNBONDED_KEYS_TRESHOLD) {
        const f: Finding = new Finding()
        f.setName(`🟢 CSAccounting: Too many unbonded validators since last block.`)
        f.setDescription(
          `Node Operator #${noId} has ${unbondedKeysCount} unbonded validators since ${blockDto.number} block.`,
        )
        f.setAlertid('CS-ACCOUNTING-TOO-MANY-UNBONDED-KEYS')
        f.setSeverity(Finding.Severity.LOW)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      }
    })

    return out
  }

  // * unfinished implementation
  public async handleBondShareDiscrepancy(): Promise<Finding[]> {
    const out: Finding[] = []

    const csAccounting = new ethers.Contract(this.csAccountingAddress, CS_ACCOUNTING_ABI, getEthersProvider())
    const totalBondShares = await csAccounting.totalBondShares()
    const sharesOf = await csAccounting.sharesOf(this.csAccountingAddress)

    if (sharesOf.sub(totalBondShares).gt(ethers.BigNumber.from('100'))) {
      const f: Finding = new Finding()
      f.setName(`🟢 LOW: Bond share discrepancy detected.`)
      f.setDescription(`Difference between sharesOf(${this.csAccountingAddress}) and totalBondShares exceeds 100 wei.`)
      f.setAlertid('CS-ACCOUNTING-BOND-SHARE-DISCREPANCY')
      f.setSeverity(Finding.Severity.LOW)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      out.push(f)
    }

    return out
  }

  public handleStETHApprovalEvents(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const approvalEvents = filterLog(txEvent.logs, APPROVAL_EVENT, this.stETHAddress)
    if (approvalEvents.length === 0) {
      return []
    }

    for (const event of approvalEvents) {
      if (event.args.owner === this.csAccountingAddress) {
        const f: Finding = new Finding()
        f.setName(`🔵 Lido stETH: Approval`)
        f.setDescription(`${event.args.spender} received allowance from ${event.args.owner} to ${event.args.value}`)
        f.setAlertid('STETH-APPROVAL')
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      }
    }
    return out
  }

  public async handleTransaction(txEvent: TransactionDto): Promise<Finding[]> {
    const out: Finding[] = []

    const csAccountingFindings = handleEventsOfNotice(txEvent, this.csAccountingEvents)
    const stETHApprovalFindings = this.handleStETHApprovalEvents(txEvent)

    const csModule = new ethers.Contract(this.csModuleAddress, CS_MODULE_ABI, getEthersProvider())
    const csModuleNodeOperatorAddedFilter = csModule.filters.NodeOperatorAdded()
    const [events] = await getLogsByChunks(
      csModule,
      csModuleNodeOperatorAddedFilter,
      txEvent.block.number, // start block,
      txEvent.block.number, // end block,
    )
    if (events) {
      this.nodeOperatorAddedEvents.push(events)
    }

    out.push(...csAccountingFindings, ...stETHApprovalFindings)

    return out
  }
}
