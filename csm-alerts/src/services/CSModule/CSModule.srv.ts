import {
    BlockEvent,
    Finding,
    FindingSeverity,
    FindingType,
    TransactionEvent,
    ethers,
    filterLog,
} from '@fortanetwork/forta-bot'
import { Logger } from 'winston'

import { IS_CLI } from '../../config'
import { CSModule__factory, StakingRouter__factory } from '../../generated/typechain'
import { getLogger } from '../../logger'
import { BASIS_POINT_MUL, SECONDS_PER_DAY } from '../../shared/constants'
import { Service } from '../../shared/types'
import { sourceFromEvent } from '../../utils/findings'
import { RedefineMode, requireWithTier } from '../../utils/require'
import { formatEther } from '../../utils/string'
import * as Constants from '../constants'

const { DEPLOYED_ADDRESSES } = requireWithTier<typeof Constants>(
    module,
    '../constants',
    RedefineMode.Merge,
)
const ICSModule = CSModule__factory.createInterface()

const CHECK_QUEUE_INTERVAL_BLOCKS = 1801 // ~ 4 times a day
const CHECK_SHARE_INTERVAL_BLOCKS = 2401 // ~ 3 times a day
const CHECK_PROVER_BALANCE_INTERVAL_BLOCKS = 7201 // ~ 1 time a day
const TARGET_SHARE_USED_PERCENT_MAX = 95
const TARGET_SHARE_TOLERANCE_BP = 5n
const PRIORITY_EXIT_SHARE_DIFF_TO_ALERT_BP = 5n
const QUEUE_EMPTY_BATCHES_MAX = 30
const QUEUE_VALIDATORS_MAX = 200
const MIN_PROVER_BALANCE = 5n * 10n ** 17n // 0.5 ether

class Batch {
    value: bigint

    constructor(v: bigint) {
        this.value = v
    }

    noId(): bigint {
        return this.value >> 192n
    }

    keys(): bigint {
        return (this.value >> 128n) & BigInt('0xFFFFFFFFFFFFFFFF')
    }

    next(): bigint {
        return this.value & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')
    }
}

export class CSModuleSrv implements Service {
    private readonly logger: Logger

    private lastFiredAt = {
        moduleShareIsCloseToPriorityExitShare: 0,
        moduleShareIsCloseToTargetShare: 0,
        tooManyEmptyBatches: 0,
        tooManyValidators: 0,
    }

    constructor() {
        this.logger = getLogger(this.getName())
    }

    getName() {
        return CSModuleSrv.name
    }

    async handleBlock(blockEvent: BlockEvent, provider: ethers.Provider): Promise<Finding[]> {
        return [
            ...(await this.checkDepositQueue(blockEvent, provider)),
            ...(await this.checkModuleShare(blockEvent, provider)),
            ...(await this.checkProverBalance(blockEvent, provider)),
        ]
    }

    async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
        return this.handleNotableOperatorsCreated(txEvent)
    }

    private handleNotableOperatorsCreated(txEvent: TransactionEvent) {
        const out: Finding[] = []

        const nodeOperatorAddedEvents = filterLog(
            txEvent.logs,
            ICSModule.getEvent('NodeOperatorAdded').format('full'),
            DEPLOYED_ADDRESSES.CS_MODULE,
        )

        for (const event of nodeOperatorAddedEvents) {
            if (event.args.nodeOperatorId % 100n === 0n || event.args.nodeOperatorId === 69n) {
                const f = Finding.fromObject({
                    name: `🔵 CSModule: Notable Node Operator creation`,
                    description: `Operator #${event.args.nodeOperatorId} was created.`,
                    alertId: 'CS-MODULE-NOTABLE-NODE-OPERATOR-CREATION',
                    source: sourceFromEvent(txEvent),
                    severity: FindingSeverity.Info,
                    type: FindingType.Info,
                })
                out.push(f)
            }
        }

        return out
    }

    private async checkModuleShare(
        blockEvent: BlockEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        if (blockEvent.blockNumber % CHECK_SHARE_INTERVAL_BLOCKS !== 0 && !IS_CLI) {
            return []
        }

        const stakingRouter = StakingRouter__factory.connect(
            DEPLOYED_ADDRESSES.STAKING_ROUTER,
            provider,
        )

        let totalActiveValidators = 0n
        let csmActiveValidators = 0n
        let csmTargetShareBP = 0n
        let csmPriorityExitShareBP = 0n

        const digests = await stakingRouter.getAllStakingModuleDigests({
            blockTag: blockEvent.blockHash,
        })

        for (const d of digests) {
            const moduleActiveValidators =
                d.summary.totalDepositedValidators - d.summary.totalExitedValidators
            totalActiveValidators += moduleActiveValidators

            if (d.state.stakingModuleAddress === DEPLOYED_ADDRESSES.CS_MODULE) {
                csmActiveValidators = moduleActiveValidators
                csmTargetShareBP = d.state.stakeShareLimit
                csmPriorityExitShareBP = d.state.priorityExitShareThreshold
            }
        }

        if (totalActiveValidators === 0n || csmActiveValidators === 0n) {
            this.logger.debug('No validators in modules or in the CSM')
            return []
        }

        if (csmTargetShareBP === 0n) {
            this.logger.debug('CSM has no target share')
            return []
        }

        const csmCurrentShareBP = (csmActiveValidators * BASIS_POINT_MUL) / totalActiveValidators
        const percentUsed = (csmCurrentShareBP * 100n) / csmTargetShareBP

        const now = blockEvent.block.timestamp
        const out: Finding[] = []

        if (now - this.lastFiredAt.moduleShareIsCloseToTargetShare > SECONDS_PER_DAY * 7) {
            if (csmCurrentShareBP > csmTargetShareBP - TARGET_SHARE_TOLERANCE_BP) {
                this.logger.debug(
                    `High CSM share utilization: current=${csmCurrentShareBP}BP, target=${csmTargetShareBP}BP, do not fire CS-MODULE-CLOSE-TO-TARGET-SHARE.`,
                )
            } else if (percentUsed > TARGET_SHARE_USED_PERCENT_MAX) {
                const f = Finding.fromObject({
                    name: `🫧 CSModule: Module's share is close to the target share.`,
                    description: `The module's share is close to the target share (${percentUsed}% utilization). Current share is ${(Number(csmCurrentShareBP * 100n) / Number(BASIS_POINT_MUL)).toFixed(2)}%. Target share is ${(Number(csmTargetShareBP * 100n) / Number(BASIS_POINT_MUL)).toFixed(2)}%`,
                    alertId: 'CS-MODULE-CLOSE-TO-TARGET-SHARE',
                    // NOTE: Do not include the source to reach quorum.
                    // source: sourceFromEvent(blockEvent),
                    severity: FindingSeverity.Low,
                    type: FindingType.Info,
                })
                out.push(f)
                this.lastFiredAt.moduleShareIsCloseToTargetShare = now
            }
        }

        if (now - this.lastFiredAt.moduleShareIsCloseToPriorityExitShare > SECONDS_PER_DAY * 7) {
            if (csmCurrentShareBP >= csmPriorityExitShareBP) {
                this.logger.debug(
                    `CSM share is higher than priority exit share: current=${csmCurrentShareBP}BP, exitShare=${csmPriorityExitShareBP}BP, do not fire CS-MODULE-CLOSE-TO-PRIORITY-EXIT-SHARE.`,
                )
            } else if (
                csmCurrentShareBP >
                csmPriorityExitShareBP - PRIORITY_EXIT_SHARE_DIFF_TO_ALERT_BP
            ) {
                const f = Finding.fromObject({
                    name: `🔵 CSModule: Module's share is close to the priority exit share.`,
                    description: `The module's share is close to the priority exit share. Current share is ${(Number(csmCurrentShareBP * 100n) / Number(BASIS_POINT_MUL)).toFixed(2)}%. Priority exit share is ${(Number(csmPriorityExitShareBP * 100n) / Number(BASIS_POINT_MUL)).toFixed(2)}%. Module's validators can be requested to exit.`,
                    alertId: 'CS-MODULE-CLOSE-TO-PRIORITY-EXIT-SHARE',
                    // NOTE: Do not include the source to reach quorum.
                    // source: sourceFromEvent(blockEvent),
                    severity: FindingSeverity.Info,
                    type: FindingType.Info,
                })
                out.push(f)
                this.lastFiredAt.moduleShareIsCloseToPriorityExitShare = now
            }
        }

        return out
    }

    private async checkDepositQueue(
        blockEvent: BlockEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        if (blockEvent.blockNumber % CHECK_QUEUE_INTERVAL_BLOCKS !== 0 && !IS_CLI) {
            return []
        }

        const csm = CSModule__factory.connect(DEPLOYED_ADDRESSES.CS_MODULE, provider)
        const ethCallOpts = { blockTag: blockEvent.blockHash }

        const queueLookup: Map<bigint, bigint> = new Map()
        let validatorsInQueue = 0n
        let emptyBatchCount = 0

        const queue = await csm.depositQueue(ethCallOpts)
        let index = queue.head

        this.logger.debug(`Queue head: ${queue.head}`)
        this.logger.debug(`Queue tail: ${queue.tail}`)

        while (index >= queue.head && index < queue.tail) {
            const batchValue = await csm.depositQueueItem(index, ethCallOpts)
            const batch = new Batch(batchValue)

            // Covers zero-batch case as well.
            if (batch.next() === 0n) {
                break
            }

            const nodeOperatorId = batch.noId()
            const keysInBatch = batch.keys()
            const no = await csm.getNodeOperator(nodeOperatorId, ethCallOpts)

            const keysSeenForOperator = queueLookup.get(nodeOperatorId) ?? 0n
            if (keysSeenForOperator >= no.depositableValidatorsCount) {
                emptyBatchCount++
            } else {
                const depositableFromBatch =
                    keysSeenForOperator + keysInBatch > no.depositableValidatorsCount
                        ? no.depositableValidatorsCount - keysSeenForOperator
                        : keysInBatch
                validatorsInQueue += depositableFromBatch
                queueLookup.set(nodeOperatorId, depositableFromBatch)
            }

            index = batch.next()
        }

        this.logger.debug(`Empty batches: ${emptyBatchCount}`)
        this.logger.debug(`Validators in the queue: ${validatorsInQueue}`)

        const now = blockEvent.block.timestamp
        const out: Finding[] = []

        if (now - this.lastFiredAt.tooManyEmptyBatches > SECONDS_PER_DAY) {
            if (emptyBatchCount > QUEUE_EMPTY_BATCHES_MAX) {
                const f = Finding.fromObject({
                    name: `🫧 CSModule: Too many empty batches in the deposit queue.`,
                    description: `More than ${QUEUE_EMPTY_BATCHES_MAX} empty batches in the deposit queue.`,
                    alertId: 'CS-MODULE-TOO-MANY-EMPTY-BATCHES-IN-THE-QUEUE',
                    // NOTE: Do not include the source to reach quorum.
                    // source: sourceFromEvent(blockEvent),
                    severity: FindingSeverity.Low,
                    type: FindingType.Info,
                })
                out.push(f)
                this.lastFiredAt.tooManyEmptyBatches = now
            }
        }

        if (now - this.lastFiredAt.tooManyValidators > SECONDS_PER_DAY) {
            if (validatorsInQueue > QUEUE_VALIDATORS_MAX) {
                const f = Finding.fromObject({
                    name: '🫧 CSModule: Significant number of validator keys in the queue.',
                    description: `There's ${validatorsInQueue} keys waiting for deposit in CSM.`,
                    alertId: 'CS-MODULE-TOO-MANY-VALIDATORS-IN-THE-QUEUE',
                    // NOTE: Do not include the source to reach quorum.
                    // source: sourceFromEvent(blockEvent),
                    severity: FindingSeverity.Low,
                    type: FindingType.Info,
                })
                out.push(f)
                this.lastFiredAt.tooManyValidators = now
            }
        }

        return out
    }

    private async checkProverBalance(
        blockEvent: BlockEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        if (blockEvent.blockNumber % CHECK_PROVER_BALANCE_INTERVAL_BLOCKS !== 0 && !IS_CLI) {
            return []
        }

        const out: Finding[] = []

        const balance = await provider.getBalance(DEPLOYED_ADDRESSES.PROVER)

        if (balance < MIN_PROVER_BALANCE) {
            const f = Finding.fromObject({
                name: '🔴 CSModule: Low prover wallet balance',
                description: `CSM Prover wallet balance is ${formatEther(balance)}`,
                alertId: 'CS-MODULE-LOW-PROVER-BALANCE',
                // NOTE: Do not include the source to reach quorum.
                // source: sourceFromEvent(blockEvent),
                severity: FindingSeverity.High,
                type: FindingType.Info,
            })
            out.push(f)
        }

        return out
    }
}
