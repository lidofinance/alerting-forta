import { either as E } from 'fp-ts'
import { EventOfNotice, TransactionDto, handleEventsOfNotice, BlockDto } from '../../entity/events'
import { elapsedTime } from '../../utils/time'
import { Logger } from 'winston'
import { Finding } from '../../generated/proto/alert_pb'
import { ethers, filterLog, getEthersProvider } from 'forta-agent'
import CS_MODULE_ABI from '../../brief/abi/CSModule.json'
import BigNumber from 'bignumber.js'
import {
  BASIS_POINTS_DIVIDER,
  MAX_EMPTY_BATCHES_IN_THE_QUEUE,
  MAX_OPERATORS_WITH_SAME_MANAGER_OR_REWARD_ADDRESS,
  MAX_TARGET_SHARE_PERCENT_USED,
  MAX_VALIDATORS_IN_THE_QUEUE,
  ONE_DAY,
} from '../../utils/constants'
import { assertInvariant, getLogsByChunks } from '../../utils/utils'
import STAKING_ROUTER_ABI from '../../brief/abi/StakingRouter.json'
import { Config } from '../../utils/env/env'
import { NODE_OPERATOR_ADDED_EVENT_ABI } from '../../utils/events/cs_module_events'

export abstract class ICSModuleClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

class Batch {
  value: bigint

  constructor(v: bigint) {
    this.value = v
  }

  noId(): bigint {
    return this.value >> BigInt(192)
  }

  keys(): bigint {
    return (this.value >> BigInt(128)) & BigInt('0xFFFFFFFFFFFFFFFF')
  }

  next(): bigint {
    return this.value & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')
  }
}

interface StakingModule {
  stakingModuleAddress: string
  targetShare: number // in basis points
}

export class CSModuleSrv {
  private readonly name = 'CSModuleSrv'
  private readonly logger: Logger
  private readonly csModuleClient: ICSModuleClient
  private readonly csModuleAddress: string
  private readonly stakingRouterAddress: string
  private readonly csModuleEvents: EventOfNotice[]
  private lastDuplicateAddressesAlertTimestamp: number = 0
  private lastModuleShareIsCloseToTargetShareAlertTimestamp: number = 0
  private lastTooManyEmptyBatchesAlertTimestamp: number = 0
  private lastTooManyValidatorsAlertTimestamp: number = 0
  private addressCounts: { [address: string]: number } = {}
  private nodeOperatorAddedEvents: ethers.Event[] = []

  constructor(
    logger: Logger,
    csModuleClient: ICSModuleClient,
    csModuleAddress: string,
    stakingRouterAddress: string,
    csModuleEvents: EventOfNotice[],
  ) {
    this.logger = logger
    this.csModuleClient = csModuleClient
    this.csModuleAddress = csModuleAddress
    this.stakingRouterAddress = stakingRouterAddress
    this.csModuleEvents = csModuleEvents
  }

  public async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()

    const config = new Config()

    const currBlock = await this.csModuleClient.getBlockByNumber(currentBlock)
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

  public handleEveryHundredOperatorsCreated(txEvent: TransactionDto) {
    const out: Finding[] = []

    const nodeOperatorAddedEvents = filterLog(txEvent.logs, NODE_OPERATOR_ADDED_EVENT_ABI, this.csModuleAddress)
    nodeOperatorAddedEvents.forEach((event) => {
      if (Number(event.args.nodeOperatorId) % 100 === 0 || Number(event.args.nodeOperatorId) === 69) {
        const f: Finding = new Finding()
        f.setName(`🔵 CSModule: Notable Node Operator creation`)
        f.setDescription(`Operator #${event.args.nodeOperatorId} was created.`)
        f.setAlertid('CS-MODULE-NOTABLE-NODE-OPERATOR-CREATION')
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      }
    })

    return out
  }

  async handleTransaction(txEvent: TransactionDto): Promise<Finding[]> {
    const out: Finding[] = []

    const csModule = new ethers.Contract(this.csModuleAddress, CS_MODULE_ABI, getEthersProvider())
    // Important to get events of type ethers.Event specificly
    // therefore fetching current block
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

    const csModuleFindings = handleEventsOfNotice(txEvent, this.csModuleEvents)
    const everyHundredOperatorsCreatedFindings = this.handleEveryHundredOperatorsCreated(txEvent)

    out.push(...csModuleFindings, ...everyHundredOperatorsCreatedFindings)

    return out
  }

  async getTotalActiveValidators(blockDto: BlockDto) {
    const stakingRouter = new ethers.Contract(this.stakingRouterAddress, STAKING_ROUTER_ABI, getEthersProvider())
    const [smDigests] = await stakingRouter.functions.getAllStakingModuleDigests({
      blockTag: blockDto.number,
    })
    let totalActiveValidators = 0
    for (const smDigest of smDigests) {
      const summary = smDigest.summary
      const totalDepositedValidators = (summary.totalDepositedValidators as BigNumber).toNumber()
      const totalExitedValidators = (summary.totalExitedValidators as BigNumber).toNumber()
      totalActiveValidators += totalDepositedValidators - totalExitedValidators
    }

    return totalActiveValidators
  }

  public async handleModuleShareIsCloseToTargetShare(
    blockDto: BlockDto,
    totalActiveValidators: number,
  ): Promise<Finding[]> {
    const out: Finding[] = []
    const now = blockDto.timestamp

    const csModule = new ethers.Contract(this.csModuleAddress, CS_MODULE_ABI, getEthersProvider())
    const stakingRouter = new ethers.Contract(this.stakingRouterAddress, STAKING_ROUTER_ABI, getEthersProvider())

    const summary = await csModule.functions.getStakingModuleSummary()
    const csTotalDepositedValidators = (summary.totalDepositedValidators as BigNumber).toNumber()
    const csTotalExitedValidators = (summary.totalExitedValidators as BigNumber).toNumber()
    const csTotalActiveValidators = csTotalDepositedValidators - csTotalExitedValidators

    const stakingModules = await stakingRouter.functions.getStakingModules()
    const csModuleInfo = stakingModules.find(
      (module: StakingModule) => module.stakingModuleAddress === this.csModuleAddress,
    )

    const currentShare = Math.ceil((csTotalActiveValidators / totalActiveValidators) * 100)
    const targetShare = Math.ceil(csModuleInfo.targetShare / BASIS_POINTS_DIVIDER)
    const percentUsed = Math.ceil((currentShare / targetShare) * 100)

    const timeSinceLastAlert = now - this.lastModuleShareIsCloseToTargetShareAlertTimestamp

    if (timeSinceLastAlert > ONE_DAY) {
      if (percentUsed >= MAX_TARGET_SHARE_PERCENT_USED) {
        const f: Finding = new Finding()
        f.setName(`🟢 CSModule: Module's share is close to the targetShare.`)
        f.setDescription(
          `The module's share is close to the target share (${percentUsed}% used). The module has ${csTotalActiveValidators} validators against ${totalActiveValidators} total. Target share: ${csModule.targetShare}`,
        )
        f.setAlertid('CS-MODULE-CLOSE-TO-TARGET-SHARE')
        f.setSeverity(Finding.Severity.LOW)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)

        this.lastModuleShareIsCloseToTargetShareAlertTimestamp = now
      }
    }
    return out
  }

  public async handleDuplicateAddresses(blockDto: BlockDto) {
    const out: Finding[] = []
    const now = blockDto.timestamp

    this.nodeOperatorAddedEvents.forEach((event) => {
      const addresses = [event.args?.managerAddress, event.args?.rewardAddress]
      addresses.forEach((address) => {
        if (address) {
          this.addressCounts[address] = (this.addressCounts[address] ?? 0) + 1
        }
      })
    })

    const timeSinceLastAlert = now - this.lastDuplicateAddressesAlertTimestamp

    if (timeSinceLastAlert > ONE_DAY) {
      Object.entries(this.addressCounts).forEach(([address, count]) => {
        if (count > MAX_OPERATORS_WITH_SAME_MANAGER_OR_REWARD_ADDRESS) {
          const f: Finding = new Finding()
          f.setName(
            `🟢 CSModule: More than ${MAX_OPERATORS_WITH_SAME_MANAGER_OR_REWARD_ADDRESS} operators have the same manager or reward address.`,
          )
          f.setDescription(`${count} operators have ${address} as manager or reward address.`)
          f.setAlertid('CS-MODULE-DUPLICATE-MANAGER-OR-REWARD-ADDRESS')
          f.setSeverity(Finding.Severity.LOW)
          f.setType(Finding.FindingType.INFORMATION)
          f.setProtocol('ethereum')

          out.push(f)

          this.lastDuplicateAddressesAlertTimestamp = now
        }
      })
    }
    return out
  }

  public async handleDepositQueueAlerts(blockDto: BlockDto) {
    const out: Finding[] = []
    const now = blockDto.timestamp

    const csModule = new ethers.Contract(this.csModuleAddress, CS_MODULE_ABI, getEthersProvider())
    const queueLookup: Map<bigint, bigint> = new Map()
    let emptyBatchCount = 0
    const queue = await csModule.depositQueue()
    let index = queue.head

    while (index < queue.tail) {
      const batchValue: bigint = await csModule.depositQueueItem(index)
      const batch = new Batch(batchValue)
      if (batch.next() === BigInt(0)) {
        break
      }
      const nodeOperatorId = batch.noId()
      const keysInBatch = batch.keys()
      const nodeOperator = csModule.getNodeOperator(nodeOperatorId, { blockTag: blockDto.number })
      const depositableKeys = nodeOperator.depositableValidatorsCount

      const keysSeenForOperator = queueLookup.get(nodeOperatorId) || 0

      if (BigInt(keysSeenForOperator) >= depositableKeys) {
        emptyBatchCount++
      } else {
        queueLookup.set(nodeOperatorId, BigInt(keysSeenForOperator) + keysInBatch)
      }

      index = batch.next()
    }

    const timeSinceLastEmptyBatchesAlert = now - this.lastTooManyEmptyBatchesAlertTimestamp

    if (timeSinceLastEmptyBatchesAlert > ONE_DAY) {
      if (emptyBatchCount > MAX_EMPTY_BATCHES_IN_THE_QUEUE) {
        const f: Finding = new Finding()
        f.setName(`🟢 CSModule: Too many empty batces in the deposit queue.`)
        f.setDescription(`${emptyBatchCount} empty batces in the deposit queue.`)
        f.setAlertid('CS-MODULE-TOO-MANY-EMPTY-BATCHES-IN-THE-QUEUE')
        f.setSeverity(Finding.Severity.LOW)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)

        this.lastTooManyEmptyBatchesAlertTimestamp = now
      }
    }

    const timeSinceLastMaxValidatorsAlert = now - this.lastTooManyValidatorsAlertTimestamp

    if (timeSinceLastMaxValidatorsAlert > ONE_DAY) {
      let validatorsInQueue = 0
      for (const [nodeOperatorId, keysInQueue] of queueLookup.entries()) {
        const depositableKeys = csModule.getNodeOperator(nodeOperatorId).depositableValidatorsCount
        const validatorsInQueuePerOperator = Math.min(Number(keysInQueue), depositableKeys)
        validatorsInQueue += validatorsInQueuePerOperator
        if (validatorsInQueue > MAX_VALIDATORS_IN_THE_QUEUE) {
          const f: Finding = new Finding()
          f.setName('🟢 CSModule: Too many validators in the queue.')
          f.setDescription(`CSModule has ${validatorsInQueue} keys in the deposit queue.`)
          f.setAlertid('CS-MODULE-TOO-MANY-VALIDATORS-IN-THE-QUEUE')
          f.setSeverity(Finding.Severity.LOW)
          f.setType(Finding.FindingType.INFORMATION)
          f.setProtocol('ethereum')

          out.push(f)

          this.lastTooManyValidatorsAlertTimestamp = now
        }
      }
    }

    return out
  }

  async handleBlock(blockDto: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const csModule = new ethers.Contract(this.csModuleAddress, CS_MODULE_ABI, getEthersProvider())

    // Invariants
    let totalDepositedValidators = 0
    let totalExitedValidators = 0
    let depositableValidatorsCount = 0

    for (let noId = 0; noId < csModule.getNodeOperatorsCount(); noId++) {
      const noSummary = csModule.getNodeOperatorSummary(noId)

      if (!csModule.publicRelease) {
        assertInvariant(
          noSummary.totalAddedKeys > csModule.MAX_SIGNING_KEYS_PER_OPERATOR_BEFORE_PUBLIC_RELEASE,
          `Invariant failed: Node Operator ${noId} has more keys than allowed before public release.`,
        )
      }

      const no = await csModule.getNodeOperator(noId)

      assertInvariant(
        !(no.totalAddedKeys >= no.totalDepositedKeys && no.totalDepositedKeys >= no.totalWithdrawnKeys),
        `Invariant failed: totalAddedKeys >= totalDepositedKeys >= totalWithdrawnKeys for Node Operator ${noId}`,
      )
      assertInvariant(
        !(no.totalDepositedKeys <= no.totalVettedKeys && no.totalVettedKeys <= no.totalAddedKeys),
        `Invariant failed: totalDepositedKeys <= totalVettedKeys <= totalAddedKeys for Node Operator ${noId}`,
      )
      assertInvariant(
        !(no.stuckValidatorsCount + no.totalWithdrawnKeys <= no.totalDepositedKeys),
        `Invariant failed: stuckValidatorsCount + totalWithdrawnKeys <= totalDepositedKeys for Node Operator ${noId}`,
      )
      assertInvariant(
        !(no.depositableValidatorsCount + no.totalExitedKeys <= no.totalAddedKeys),
        `Invariant failed: depositableValidatorsCount + totalExitedKeys <= totalAddedKeys for Node Operator ${noId}`,
      )
      assertInvariant(
        no.proposedManagerAddress === no.managerAddress,
        `Invariant failed: proposedManagerAddress should not equal managerAddress for Node Operator ${noId}`,
      )
      assertInvariant(
        no.proposedRewardAddress === no.rewardAddress,
        `Invariant failed: proposedRewardAddress should not equal rewardAddress for Node Operator ${noId}`,
      )
      assertInvariant(
        no.managerAddress === ethers.constants.AddressZero,
        `Invariant failed: managerAddress should not be zero address for Node Operator ${noId}`,
      )
      assertInvariant(
        no.rewardAddress === ethers.constants.AddressZero,
        `Invariant failed: rewardAddress should not be zero address for Node Operator ${noId}`,
      )

      const queue = await csModule.depositQueue()
      let index = queue.head
      const tail = queue.tail
      let enqueuedCount = BigInt(0)
      while (index < tail) {
        const batchValue: bigint = await csModule.depositQueueItem(index)
        const batch = new Batch(batchValue)
        if (batch.noId() === BigInt(noId)) {
          enqueuedCount += batch.keys()
        }
        index = batch.next()
        if (index === BigInt(0)) {
          break
        }
      }

      assertInvariant(
        no.enqueuedCount !== enqueuedCount,
        `Invariant failed: enqueuedCount mismatch for Node Operator ${noId}`,
      )

      totalDepositedValidators += new BigNumber(noSummary.totalDepositedKeys.toString()).toNumber()
      totalExitedValidators += new BigNumber(noSummary.totalExitedKeys.toString()).toNumber()
      depositableValidatorsCount += new BigNumber(noSummary.depositableValidatorsCount.toString()).toNumber()
    }

    const smSummary = await csModule.functions.getStakingModuleSummary()
    assertInvariant(
      smSummary.totalDepositedValidators !== totalDepositedValidators ||
        smSummary.totalExitedValidators !== totalExitedValidators ||
        smSummary.depositableValidatorsCount !== depositableValidatorsCount,
      `Invariant failed: Global summary values do not match the accumulated node operator summaries.`,
    )

    const moduleShareIsCloseToTargetShareFindings = this.handleModuleShareIsCloseToTargetShare(
      blockDto,
      await this.getTotalActiveValidators(blockDto),
    )
    const duplicateAddressesFindings = this.handleDuplicateAddresses(blockDto)
    const depositQueueFindings = this.handleDepositQueueAlerts(blockDto)

    findings.push(
      ...(await moduleShareIsCloseToTargetShareFindings),
      ...(await duplicateAddressesFindings),
      ...(await depositQueueFindings),
    )

    this.logger.info(elapsedTime(CSModuleSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }
}
