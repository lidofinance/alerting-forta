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

import {
    CSFeeDistributor__factory,
    HashConsensus__factory,
    Lido__factory,
} from '../../generated/typechain'
import { getLogger } from '../../logger'
import {
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_SLOT,
    SLOTS_PER_EPOCH,
} from '../../shared/constants'
import { Service } from '../../shared/types'
import { getEpoch } from '../../utils/epochs'
import { invariantAlert, sourceFromEvent } from '../../utils/findings'
import { getLogsByChunks } from '../../utils/logs'
import { RedefineMode, requireWithTier } from '../../utils/require'
import { formatDelay } from '../../utils/time'
import * as Constants from '../constants'

const { DEPLOYED_ADDRESSES } = requireWithTier<typeof Constants>(
    module,
    '../constants',
    RedefineMode.Merge,
)
const ICSFeeDistributor = CSFeeDistributor__factory.createInterface()

export class CSFeeDistributorSrv implements Service {
    private readonly logger: Logger

    private lastFiredAt = {
        distributionUpdateOverdue: 0,
    }

    private state = {
        lastDistributionUpdatedAt: 0,
        frameInitialEpoch: 0,
        frameInSlots: 0,
    }

    constructor() {
        this.logger = getLogger(this.getName())
    }

    getName() {
        return CSFeeDistributorSrv.name
    }

    async initialize(blockIdentifier: ethers.BlockTag, provider: ethers.Provider): Promise<void> {
        const hc = HashConsensus__factory.connect(DEPLOYED_ADDRESSES.HASH_CONSENSUS, provider)
        const frameConfig = await hc.getFrameConfig({ blockTag: blockIdentifier })
        this.state.frameInitialEpoch = Number(frameConfig.initialEpoch)

        const frameInSlots = Number(frameConfig.epochsPerFrame) * SLOTS_PER_EPOCH
        this.state.frameInSlots = frameInSlots

        const distributor = CSFeeDistributor__factory.connect(
            DEPLOYED_ADDRESSES.CS_FEE_DISTRIBUTOR,
            provider,
        )
        if ((await distributor.treeRoot({ blockTag: blockIdentifier })) === ethers.ZeroHash) {
            this.logger.debug('No distribution happened so far')
            return
        }

        const toBlock = await provider.getBlock(blockIdentifier)
        if (!toBlock) {
            throw Error('Unable to get the latest block')
        }

        const distributedEvents = await getLogsByChunks(
            distributor,
            distributor.filters.DistributionDataUpdated,
            toBlock.number - frameInSlots * 2,
            toBlock.number,
        )

        const lastDistributionEvent = distributedEvents
            .sort((a, b) => a.blockNumber - b.blockNumber)
            .pop()
        if (!lastDistributionEvent) {
            this.logger.debug('No distribution event found')
            return
        }

        this.state.lastDistributionUpdatedAt =
            (await lastDistributionEvent.getBlock())?.timestamp ?? 0
        this.logger.debug(
            `Last distribution observed at timestamp ${this.state.lastDistributionUpdatedAt}` +
                ` (${formatDelay(toBlock.timestamp - this.state.lastDistributionUpdatedAt)} ago)`,
        )
    }

    async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
        return [...this.handleDistributionOverdue(blockEvent)]
    }

    public async handleTransaction(
        txEvent: TransactionEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        const distributionDataUpdatedEvents = filterLog(
            txEvent.logs,
            ICSFeeDistributor.getEvent('DistributionDataUpdated').format('full'),
            DEPLOYED_ADDRESSES.CS_FEE_DISTRIBUTOR,
        )

        const out: Finding[] = []

        if (distributionDataUpdatedEvents.length > 0) {
            this.state.lastDistributionUpdatedAt = txEvent.block.timestamp
            out.push(...(await this.checkInvariants(txEvent, provider)))
        }

        out.push(...this.handleTransferSharesInvalidReceiver(txEvent))

        return out
    }

    private handleDistributionOverdue(blockEvent: BlockEvent): Finding[] {
        if (this.state.lastDistributionUpdatedAt === 0) {
            this.logger.debug('No previous distribution observed so far')
            return []
        }

        const now = blockEvent.block.timestamp

        if (getEpoch(blockEvent.chainId, now) < this.state.frameInitialEpoch) {
            this.logger.debug('Initial epoch has not been reached yet')
            return []
        }

        if (now - this.lastFiredAt.distributionUpdateOverdue < SECONDS_PER_DAY) {
            return []
        }

        // Just add 1 day to the frame length because it seems as a good approximation of more complex approach.
        // TODO: Fetch the current frame every time?
        const distributionIntervalSecondsMax =
            this.state.frameInSlots * SECONDS_PER_SLOT + SECONDS_PER_HOUR
        const distributionDelaySeconds = now - this.state.lastDistributionUpdatedAt
        if (distributionDelaySeconds < distributionIntervalSecondsMax) {
            return []
        }

        this.lastFiredAt.distributionUpdateOverdue = now

        return [
            Finding.fromObject({
                name: `🔴 CSFeeDistributor: Distribution overdue`,
                description: `There has been no DistributionDataUpdated event for more than ${formatDelay(distributionIntervalSecondsMax)}.`,
                alertId: 'CSFEE-DISTRIBUTION-OVERDUE',
                // NOTE: Do not include the source to reach quorum.
                // source: sourceFromEvent(blockEvent),
                severity: FindingSeverity.High,
                type: FindingType.Info,
            }),
        ]
    }

    public handleTransferSharesInvalidReceiver(txEvent: TransactionEvent): Finding[] {
        const transferSharesEvents = filterLog(
            txEvent.logs,
            Lido__factory.createInterface().getEvent('TransferShares').format('full'),
            DEPLOYED_ADDRESSES.LIDO_STETH,
        )

        const out: Finding[] = []
        for (const event of transferSharesEvents) {
            if (
                event.args.from === DEPLOYED_ADDRESSES.CS_FEE_DISTRIBUTOR &&
                event.args.to !== DEPLOYED_ADDRESSES.CS_ACCOUNTING
            ) {
                const f = Finding.fromObject({
                    name: `🚨 CSFeeDistributor: Invalid TransferShares receiver`,
                    description: `TransferShares from CSFeeDistributor to an invalid address ${event.args.to} (expected CSAccounting)`,
                    alertId: 'CSFEE-DISTRIBUTOR-INVALID-TRANSFER',
                    source: sourceFromEvent(txEvent),
                    severity: FindingSeverity.Critical,
                    type: FindingType.Info,
                })

                out.push(f)
            }
        }
        return out
    }

    private async checkInvariants(txEvent: TransactionEvent, provider: ethers.Provider) {
        const distributor = CSFeeDistributor__factory.connect(
            DEPLOYED_ADDRESSES.CS_FEE_DISTRIBUTOR,
            provider,
        )
        const steth = Lido__factory.connect(DEPLOYED_ADDRESSES.LIDO_STETH, provider)

        const blockTag = txEvent.block.hash

        const out: Finding[] = []

        const treeRoot = await distributor.treeRoot({ blockTag })
        const treeCid = await distributor.treeCid({ blockTag })
        if (treeRoot !== ethers.ZeroHash && treeCid === '') {
            out.push(invariantAlert(txEvent, 'Tree exists, but no CID'))
        }
        if (treeRoot === ethers.ZeroHash && treeCid !== '') {
            out.push(invariantAlert(txEvent, 'Tree CID exists, but no root'))
        }

        if (
            (await distributor.totalClaimableShares({ blockTag })) >
            (await steth.sharesOf(distributor, { blockTag }))
        ) {
            out.push(invariantAlert(txEvent, "distributed more than the contract's balance"))
        }

        return out
    }
}
