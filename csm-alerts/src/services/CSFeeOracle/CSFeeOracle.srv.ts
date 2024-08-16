import { elapsedTime } from '../../utils/time'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { ethers, filterLog, getEthersProvider } from 'forta-agent'
import { ONE_DAY, ONE_MONTH, SECONDS_PER_SLOT } from '../../utils/constants'
import CS_FEE_ORACLE_ABI from '../../brief/abi/CSFeeOracle.json'
import HASH_CONSENSUS_ABI from '../../brief/abi/HashConsensus.json'
import { getLogsByChunks } from '../../utils/utils'
import { HASH_CONSENSUS_REPORT_RECEIVED_EVENT } from '../../utils/events/cs_fee_oracle_events'
import BigNumber from 'bignumber.js'
export abstract class ICSFeeOracleClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

interface MemberReport {
  refSlot: BigNumber
  report: string
  blockNumber: number
}

export class CSFeeOracleSrv {
  private readonly name = 'CSFeeOracleSrv'
  private readonly logger: Logger
  private readonly csFeeOracleClient: ICSFeeOracleClient

  private readonly hashConsensusEvents: EventOfNotice[]
  private readonly csFeeOracleEvents: EventOfNotice[]

  private readonly hashConsensusAddress: string
  private readonly csFeeOracleAddress: string

  private lastReportSubmitTimestamp: number = 0
  private lastReportOverdueAlertTimestamp: number = 0
  private membersAddresses: string[] = []
  private membersLastReport: Map<string, MemberReport> = new Map()

  constructor(
    logger: Logger,
    ethProvider: ICSFeeOracleClient,
    hashConsensusEvents: EventOfNotice[],
    csFeeOracleEvents: EventOfNotice[],
    hashConsensusAddress: string,
    csFeeOracleAddress: string,
  ) {
    this.logger = logger
    this.csFeeOracleClient = ethProvider

    this.hashConsensusAddress = hashConsensusAddress
    this.csFeeOracleAddress = csFeeOracleAddress

    this.hashConsensusEvents = hashConsensusEvents
    this.csFeeOracleEvents = csFeeOracleEvents
  }

  async getOracleMembers(blockNumber: number, hashConsensus: ethers.Contract): Promise<string[]> {
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

    const hashConsensus = new ethers.Contract(this.hashConsensusAddress, HASH_CONSENSUS_ABI, getEthersProvider())
    this.membersAddresses = await this.getOracleMembers(currentBlock, hashConsensus)
    const hashConsensusReportReceivedFilter = hashConsensus.filters.ReportReceived()
    const reportReceivedStartBlock = currentBlock - Math.ceil(ONE_MONTH / SECONDS_PER_SLOT)
    const reportReceivedEvents = await getLogsByChunks(
      hashConsensus,
      hashConsensusReportReceivedFilter,
      reportReceivedStartBlock,
      currentBlock,
    )
    reportReceivedEvents.sort((a, b) => a.blockNumber - b.blockNumber)

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

    const reportSubmits = await this.getReportSubmits(
      currentBlock - Math.ceil(ONE_MONTH / SECONDS_PER_SLOT),
      currentBlock,
    )

    if (reportSubmits.length > 0) {
      this.lastReportSubmitTimestamp = (await reportSubmits[reportSubmits.length - 1].getBlock()).timestamp
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  async getReportSubmits(blockFrom: number, blockTo: number) {
    const csFeeOracle = new ethers.Contract(this.csFeeOracleAddress, CS_FEE_ORACLE_ABI, getEthersProvider())
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

    const now = blockDto.timestamp

    const hashConsensus = new ethers.Contract(this.hashConsensusAddress, HASH_CONSENSUS_ABI, getEthersProvider())
    const frameConfig = await hashConsensus.functions.getFrameConfig()
    const MAX_REPORT_DELAY = frameConfig.epochsPerFrame * 32 * SECONDS_PER_SLOT

    const reportDelay = now - (this.lastReportSubmitTimestamp ? this.lastReportSubmitTimestamp : 0)

    const timeSinceLastAlert = now - this.lastReportOverdueAlertTimestamp

    if (timeSinceLastAlert > ONE_DAY) {
      if (reportDelay > MAX_REPORT_DELAY) {
        const f: Finding = new Finding()
        f.setName(`🔴 CSFeeOracle: Report overdue`)
        f.setDescription(`Report is overdue by ${Math.floor(reportDelay / ONE_DAY)} days`)
        f.setAlertid('CS-FEE-ORACLE-REPORT-OVERDUE')
        f.setSeverity(Finding.Severity.HIGH)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)

        this.lastReportOverdueAlertTimestamp = now
      }
    }
    return out
  }

  public handleAlternativeHashReceived(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const [event] = filterLog(txEvent.logs, HASH_CONSENSUS_REPORT_RECEIVED_EVENT, this.hashConsensusAddress)

    const currentReportHashes = [...this.membersLastReport.values()]
      .filter((r) => r.refSlot.eq(event.args.refSlot))
      .map((r) => r.report)

    if (currentReportHashes.length > 0 && !currentReportHashes.includes(event.args.report)) {
      const f = new Finding()
      f.setName('🔴 HashConsensus: Another report variant appeared (alternative hash)')
      f.setDescription(
        `More than one distinct report hash received for slot ${event.args.refSlot}. Member: ${event.args.member}. Report: ${event.args.report}`,
      )
      f.setAlertid('HASH-CONSENSUS-REPORT-RECEIVED')
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')
      out.push(f)

      this.membersLastReport.set(event.args.member, {
        refSlot: event.args.refSlot,
        report: event.args.report,
        blockNumber: txEvent.block.number,
      })
    }
    return out
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const reportEvent = filterLog(txEvent.logs, HASH_CONSENSUS_REPORT_RECEIVED_EVENT, this.hashConsensusAddress)
    if (reportEvent) {
      this.lastReportSubmitTimestamp = txEvent.block.timestamp
    }

    const hashConsensusFindings = handleEventsOfNotice(txEvent, this.hashConsensusEvents)
    const csFeeOracleFindings = handleEventsOfNotice(txEvent, this.csFeeOracleEvents)
    const alternativeHashReceivedFindings = this.handleAlternativeHashReceived(txEvent)

    out.push(...hashConsensusFindings, ...csFeeOracleFindings, ...alternativeHashReceivedFindings)

    return out
  }
}
