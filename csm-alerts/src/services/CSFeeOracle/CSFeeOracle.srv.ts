import { elapsedTime } from '../../utils/time'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { ethers, filterLog, getEthersProvider } from 'forta-agent'
import {
  DeploymentAddresses,
  MemberReport,
  ONE_DAY,
  ONE_MONTH,
  ONE_WEEK,
  SECONDS_PER_SLOT,
} from '../../utils/constants.holesky'
import CS_FEE_ORACLE_ABI from '../../brief/abi/CSFeeOracle.json'
import HASH_CONSENSUS_ABI from '../../brief/abi/HashConsensus.json'
import { getLogsByChunks } from '../../utils/utils'
import { HASH_CONSENSUS_REPORT_RECEIVED_EVENT } from '../../utils/events/cs_fee_oracle_events'
import BigNumber from 'bignumber.js'
export abstract class ICSFeeOracleClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class CSFeeOracleSrv {
  private readonly name = 'CSFeeOracleSrv'
  private readonly logger: Logger
  private readonly csFeeOracleClient: ICSFeeOracleClient

  private readonly ossifiedProxyEvents: EventOfNotice[]
  private readonly pausableEvents: EventOfNotice[]
  private readonly burnerEvents: EventOfNotice[]
  private readonly hashConsensusEvents: EventOfNotice[]
  private readonly csFeeOracleEvents: EventOfNotice[]

  private slotReports: { [slot: number]: Set<string> } = {}
  private membersAddresses: string[] = []
  private membersLastReport: Map<string, MemberReport> = new Map()

  constructor(
    logger: Logger,
    ethProvider: ICSFeeOracleClient,
    ossifiedProxyEvents: EventOfNotice[],
    pausableEvents: EventOfNotice[],
    burnerEvents: EventOfNotice[],
    hashConsensusEvents: EventOfNotice[],
    csFeeOracleEvents: EventOfNotice[],
  ) {
    this.logger = logger
    this.csFeeOracleClient = ethProvider

    this.ossifiedProxyEvents = ossifiedProxyEvents
    this.pausableEvents = pausableEvents
    this.burnerEvents = burnerEvents
    this.hashConsensusEvents = hashConsensusEvents
    this.csFeeOracleEvents = csFeeOracleEvents
  }

  async getOracleMembers(blockNumber: number): Promise<string[]> {
    const hashConsensus = new ethers.Contract(
      DeploymentAddresses.HASH_CONSENSUS_ADDRESS,
      HASH_CONSENSUS_ABI,
      getEthersProvider(),
    )

    const members = await hashConsensus.functions.getMembers({
      blockTag: blockNumber,
    })
    return members.addresses
  }

  public async initialize(currentBlock: number): Promise<Finding[] | null | Error> {
    const start = new Date().getTime()

    const currBlock = await this.csFeeOracleClient.getBlockByNumber(currentBlock)
    if (E.isLeft(currBlock)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return currBlock.left
    }

    const hashConsensus = new ethers.Contract(
      DeploymentAddresses.HASH_CONSENSUS_ADDRESS,
      HASH_CONSENSUS_ABI,
      getEthersProvider(),
    )

    this.membersAddresses = await this.getOracleMembers(currentBlock)
    const memberReportReceivedFilter = hashConsensus.filters.ReportReceived()
    // ~14 days ago
    const reportReceivedStartBlock = currentBlock - Math.ceil((2 * ONE_WEEK) / SECONDS_PER_SLOT)
    const reportReceivedEvents = await getLogsByChunks(
      hashConsensus,
      memberReportReceivedFilter,
      reportReceivedStartBlock,
      currentBlock - 1,
    )

    this.membersAddresses.forEach((member: string) => {
      const memberReports = reportReceivedEvents.filter((event) => {
        if (event.args) {
          return event.args.member == member
        }
      })
      if (memberReports.length > 0) {
        const lastReport = memberReports[memberReports.length - 1]
        if (lastReport.args) {
          this.membersLastReport.set(member, {
            refSlot: lastReport.args.refSlot,
            report: lastReport.args.report,
            blockNumber: lastReport.blockNumber,
          })
        }
      } else {
        this.membersLastReport.set(member, {
          refSlot: new BigNumber(0),
          report: '',
          blockNumber: 0,
        })
      }
    })

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  async getReportSubmits(blockFrom: number, blockTo: number) {
    const csFeeOracle = new ethers.Contract(
      DeploymentAddresses.CS_FEE_ORACLE_ADDRESS,
      CS_FEE_ORACLE_ABI,
      getEthersProvider(),
    )

    const oracleReportFilter = csFeeOracle.filters.ReportSubmitted()

    return await getLogsByChunks(csFeeOracle, oracleReportFilter, blockFrom, blockTo)
  }

  async handleBlock(blockDto: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [reportOverdueFindings] = await Promise.all([this.handleReportOverdue(blockDto)])

    findings.push(...reportOverdueFindings)

    this.logger.info(elapsedTime(CSFeeOracleSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleReportOverdue(blockDto: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    const reportSubmits = await this.getReportSubmits(
      blockDto.number - Math.ceil(ONE_DAY / SECONDS_PER_SLOT),
      blockDto.number - 1,
    )
    const now = blockDto.timestamp
    let lastReportSubmitTimestamp = 0

    if (reportSubmits.length > 0) {
      lastReportSubmitTimestamp = (await reportSubmits[reportSubmits.length - 1].getBlock()).timestamp
    }
    const reportDelayUpdated = now - (lastReportSubmitTimestamp ? lastReportSubmitTimestamp : 0)
    if (reportDelayUpdated > ONE_MONTH) {
      const f: Finding = new Finding()
      f.setName(`🔴 CSFeeOracle: Report overdue`)
      f.setDescription(`Report is overdue by ${reportDelayUpdated} seconds`)
      f.setAlertid('CS-FEE-ORACLE-REPORT-OVERDUE')
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      out.push(f)
    }
    return out
  }

  public handleAlternativeHashReceived(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const [event] = filterLog(
      txEvent.logs,
      HASH_CONSENSUS_REPORT_RECEIVED_EVENT,
      DeploymentAddresses.HASH_CONSENSUS_ADDRESS,
    )

    const currentReportHashes = [...this.membersLastReport.values()]
      .filter((r) => r.refSlot.eq(event.args.refSlot))
      .map((r) => r.report)

    if (currentReportHashes.length > 1 && !currentReportHashes.includes(event.args.report)) {
      const f = new Finding()
      f.setName('🔴 HashConsensus: Another report variant appeared (alternative hash)')
      f.setDescription(`More than one distinct report hash received for slot ${event.args.refSlot}`)
      f.setAlertid('HASH-CONSENSUS-REPORT-RECEIVED')
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.INFORMATION)
      out.push(f)
    }
    return out
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const ossifiedProxyFindings = handleEventsOfNotice(txEvent, this.ossifiedProxyEvents)
    const pausableEventsFindings = handleEventsOfNotice(txEvent, this.pausableEvents)
    const burnerFindings = handleEventsOfNotice(txEvent, this.burnerEvents)
    const hashConsensusFindings = handleEventsOfNotice(txEvent, this.hashConsensusEvents)
    const csFeeOracleFindings = handleEventsOfNotice(txEvent, this.csFeeOracleEvents)
    const alternativeHashReceivedFindings = this.handleAlternativeHashReceived(txEvent)

    out.push(
      ...ossifiedProxyFindings,
      ...pausableEventsFindings,
      ...burnerFindings,
      ...hashConsensusFindings,
      ...csFeeOracleFindings,
      ...alternativeHashReceivedFindings,
    )

    return out
  }
}
