import { elapsedTime } from '../../utils/time'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Logger } from 'winston'
import { either as E } from 'fp-ts'
import { Finding } from '../../generated/proto/alert_pb'
import CS_FEE_DISTRIBUTOR_ABI from '../../brief/abi/CSFeeDistributor.json'
import HASH_CONSENSUS_ABI from '../../brief/abi/HashConsensus.json'
import { ONE_DAY, SECONDS_PER_SLOT } from '../../utils/constants'
import { filterLog } from 'forta-agent'
import { ethers } from 'ethers'
import { DISTRIBUTION_DATA_UPDATED_EVENT, TRANSFER_SHARES_EVENT } from '../../utils/events/cs_fee_distributor_events'
import { getLogsByChunks } from '../../utils/utils'

export abstract class ICSFeeDistributorClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>

  public getEthersProvider(): ethers.JsonRpcProvider {
    return this.getEthersProvider()
  }
}

export class CSFeeDistributorSrv {
  private name = `CSFeeDistributorSrv`

  private readonly logger: Logger
  private readonly csFeeDistributorClient: ICSFeeDistributorClient

  private readonly csFeeDistributorEvents: EventOfNotice[]
  private readonly csAccountingAddress: string
  private readonly csFeeDistributorAddress: string
  private readonly stETHAddress: string
  private readonly hashConsensusAddress: string

  private lastDistributionDataUpdatedTimestamp: number = 0
  private lastNoDistributionDataUpdatedAlertTimestamp: number = 0

  constructor(
    logger: Logger,
    ethProvider: ICSFeeDistributorClient,
    csFeeDistributorEvents: EventOfNotice[],
    csAccountingAddress: string,
    csFeeDistributorAddress: string,
    stETHAddress: string,
    hashConsensusAddress: string,
  ) {
    this.logger = logger
    this.csFeeDistributorClient = ethProvider
    this.csFeeDistributorEvents = csFeeDistributorEvents
    this.csAccountingAddress = csAccountingAddress
    this.csFeeDistributorAddress = csFeeDistributorAddress
    this.stETHAddress = stETHAddress
    this.hashConsensusAddress = hashConsensusAddress
  }

  async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()

    const currBlock = await this.csFeeDistributorClient.getBlockByNumber(currentBlock)
    if (E.isLeft(currBlock)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return currBlock.left
    }

    const csFeeDistributor = new ethers.Contract(
      this.csFeeDistributorAddress,
      CS_FEE_DISTRIBUTOR_ABI,
      this.csFeeDistributorClient.getEthersProvider(),
    )
    const hashConsensus = new ethers.Contract(
      this.hashConsensusAddress,
      HASH_CONSENSUS_ABI,
      this.csFeeDistributorClient.getEthersProvider(),
    )
    const frameConfig = await hashConsensus.getFrameConfig()
    const frameInSeconds = frameConfig.epochsPerFrame * 32 * SECONDS_PER_SLOT
    const startBlock = currentBlock - Math.ceil(frameInSeconds / SECONDS_PER_SLOT)
    const csFeeDistributorDistributionDataUpdatedFilter = csFeeDistributor.getEvent(DISTRIBUTION_DATA_UPDATED_EVENT)
    const distributionDataUpdatedEvents = await getLogsByChunks(
      csFeeDistributor,
      csFeeDistributorDistributionDataUpdatedFilter,
      startBlock,
      currentBlock,
    )

    if (distributionDataUpdatedEvents.length > 0) {
      this.lastDistributionDataUpdatedTimestamp = currBlock.right.timestamp
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  async handleBlock(blockDto: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const out: Finding[] = []

    const [revertedTxFindings, rolesChangingFindings] = await Promise.all([
      this.handleRevertedTx(blockDto.number),
      this.handleRolesChanging(blockDto.number),
    ])

    if (blockDto.number % 10 === 0) {
      const distributionDataUpdatedFindings = await this.handleDistributionDataUpdated(blockDto)
      out.push(...distributionDataUpdatedFindings)
    }

    out.push(...revertedTxFindings, ...rolesChangingFindings)

    this.logger.info(elapsedTime(CSFeeDistributorSrv.name + '.' + this.handleBlock.name, start))

    return out
  }
  // to be implemented
  handleRolesChanging(blockNumber: number): Promise<Finding[]> {
    const out: Finding = new Finding()
    this.logger.info(`${blockNumber}`)
    return Promise.resolve([out])
  }
  // to be implemented
  handleRevertedTx(blockNumber: number): Promise<Finding[]> {
    const out: Finding = new Finding()
    this.logger.info(`${blockNumber}`)
    return Promise.resolve([out])
  }

  private async handleDistributionDataUpdated(blockDto: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    const hashConsensus = new ethers.Contract(this.hashConsensusAddress, HASH_CONSENSUS_ABI)
    const frameConfig = await hashConsensus.getFrameConfig()
    const frameInSeconds = frameConfig.epochsPerFrame * 32 * SECONDS_PER_SLOT

    const now = blockDto.timestamp

    const chainConfig = await hashConsensus.getChainConfig()
    const genesisTimestamp = chainConfig.genesisTime
    const currentEpoch = Math.floor((now - genesisTimestamp) / 32 / SECONDS_PER_SLOT)
    if (currentEpoch < frameConfig.initialEpoch + frameConfig.epochsPerFrame) {
      return out
    }

    const timeSinceLastAlert = now - this.lastNoDistributionDataUpdatedAlertTimestamp

    if (timeSinceLastAlert > ONE_DAY) {
      if (now - this.lastDistributionDataUpdatedTimestamp > frameInSeconds) {
        const daysSinceLastUpdate = Math.floor((now - this.lastDistributionDataUpdatedTimestamp) / ONE_DAY)

        const f = new Finding()
        f.setName(`🔴 CSFeeDistributor: No DistributionDataUpdated Event`)
        f.setDescription(`There has been no DistributionDataUpdated event for ${daysSinceLastUpdate} days.`)
        f.setAlertid('CSFEE-NO-DISTRIBUTION-DATA-UPDATED')
        f.setSeverity(Finding.Severity.HIGH)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)

        this.lastNoDistributionDataUpdatedAlertTimestamp = now
      }
    }
    return out
  }

  public async handleTransaction(txEvent: TransactionDto): Promise<Finding[]> {
    const out: Finding[] = []

    const distributionDataUpdatedEvents = filterLog(
      txEvent.logs,
      DISTRIBUTION_DATA_UPDATED_EVENT,
      this.csFeeDistributorAddress,
    )

    if (distributionDataUpdatedEvents.length > 0) {
      this.lastDistributionDataUpdatedTimestamp = txEvent.block.timestamp
    }

    const csFeeDistributorFindings = handleEventsOfNotice(txEvent, this.csFeeDistributorEvents)
    const transferSharesInvalidReceiverFindings = this.handleTransferSharesInvalidReceiver(txEvent)

    out.push(...csFeeDistributorFindings, ...transferSharesInvalidReceiverFindings)

    return out
  }

  public handleTransferSharesInvalidReceiver(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const transferSharesEvents = filterLog(txEvent.logs, TRANSFER_SHARES_EVENT, this.stETHAddress)
    if (transferSharesEvents.length === 0) {
      return []
    }

    for (const event of transferSharesEvents) {
      if (
        event.args.from.toLowerCase() === this.csFeeDistributorAddress.toLowerCase() &&
        event.args.to.toLowerCase() !== this.csAccountingAddress.toLowerCase()
      ) {
        const f: Finding = new Finding()
        f.setName(`🚨 CSFeeDistributor: Invalid TransferShares receiver`)
        f.setDescription(
          `TransferShares from CSFeeDistributor to an invalid address ${event.args.to} (expected CSAccounting)`,
        )
        f.setAlertid('CSFEE-DISTRIBUTOR-INVALID-TRANSFER')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      }
    }
    return out
  }
}
