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
import {
    CSAccounting__factory,
    CSModule__factory,
    Lido__factory,
    Multicall3__factory,
} from '../../generated/typechain'
import { getLogger } from '../../logger'
import { SECONDS_PER_DAY, WEI_PER_ETH } from '../../shared/constants'
import { Service } from '../../shared/types'
import { sourceFromEvent } from '../../utils/findings'
import { RedefineMode, requireWithTier } from '../../utils/require'
import { addressOnExplorer, formatShares } from '../../utils/string'
import * as Constants from '../constants'

const { DEPLOYED_ADDRESSES } = requireWithTier<typeof Constants>(
    module,
    '../constants',
    RedefineMode.Merge,
)

const ILido = Lido__factory.createInterface()
const ICSAccounting = CSAccounting__factory.createInterface()

const CHECK_ACCOUNTING_INTERVAL_BLOCKS = 301 // ~ every hour
const ACCOUNTING_BALANCE_EXCESS_SHARES_MAX = WEI_PER_ETH / 10n
const CURVE_EARLY_ADOPTION_ID = 1n
const CURVE_DEFAULT_ID = 0n

export class CSAccountingSrv implements Service {
    private readonly logger: Logger

    private lastFiredAt = { accountingExcessShares: 0 }

    constructor() {
        this.logger = getLogger(this.getName())
    }

    getName() {
        return CSAccountingSrv.name
    }

    async handleBlock(blockEvent: BlockEvent, provider: ethers.Provider): Promise<Finding[]> {
        return [...(await this.checkAccountingSharesDiscrepancy(blockEvent, provider))]
    }

    public async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
        return [
            ...this.handleStETHApprovalEvents(txEvent),
            ...this.handleSetBondCurveEvent(txEvent),
            ...this.handleBondBurnedEvent(txEvent),
        ]
    }

    async checkAccountingSharesDiscrepancy(
        blockEvent: BlockEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        if (blockEvent.blockNumber % CHECK_ACCOUNTING_INTERVAL_BLOCKS !== 0 && !IS_CLI) {
            return []
        }

        const multicall = Multicall3__factory.connect(DEPLOYED_ADDRESSES.MULTICALL3, provider)
        const { blockNumber, returnData } = await multicall.tryBlockAndAggregate(
            true, // requireSuccess
            [
                {
                    target: DEPLOYED_ADDRESSES.LIDO_STETH,
                    callData: ILido.encodeFunctionData('sharesOf', [
                        DEPLOYED_ADDRESSES.CS_ACCOUNTING,
                    ]) as `0x${string}`,
                },
                {
                    target: DEPLOYED_ADDRESSES.CS_ACCOUNTING,
                    callData: ICSAccounting.encodeFunctionData('totalBondShares') as `0x${string}`,
                },
            ],
            { blockTag: blockEvent.blockHash },
        )

        if (blockNumber != BigInt(blockEvent.blockNumber)) {
            this.logger.warn(
                `Unexpected block number, got=${blockNumber}, expected=${blockEvent.blockNumber}`,
            )
        }

        const totalBondShares = BigInt(returnData[0][1])
        const actualBalance = BigInt(returnData[1][1])
        const diff = totalBondShares - actualBalance

        const now = blockEvent.block.timestamp
        const out: Finding[] = []

        if (now - this.lastFiredAt.accountingExcessShares > SECONDS_PER_DAY) {
            if (diff > ACCOUNTING_BALANCE_EXCESS_SHARES_MAX) {
                const f = Finding.fromObject({
                    name: `🫧 Shares to recover on CSAccounting.`,
                    description: `There's more than ${formatShares(ACCOUNTING_BALANCE_EXCESS_SHARES_MAX)} to recover on CSAccounting.`,
                    alertId: 'CS-ACCOUNTING-EXCESS-SHARES',
                    // NOTE: Do not include the source to reach quorum.
                    // source: sourceFromEvent(blockEvent),
                    severity: FindingSeverity.Low,
                    type: FindingType.Info,
                })
                out.push(f)
                this.lastFiredAt.accountingExcessShares = now
            }
        }

        // NOTE: This is a critical invariant, so we fire every CHECK_ACCOUNTING_INTERVAL_BLOCKS.
        if (diff < 0n) {
            const f = Finding.fromObject({
                name: '🚨 Not enough shares on CSAccounting',
                description: 'sharesOf(CSAccounting) < CSAccounting.totalBondShares',
                alertId: 'CS-ACCOUNTING-NOT-ENOUGH-SHARES',
                // NOTE: Do not include the source to reach quorum.
                // source: sourceFromEvent(blockEvent),
                severity: FindingSeverity.Unknown,
                type: FindingType.Info,
                metadata: {
                    blockHash: blockEvent.blockHash,
                    multicallResult: JSON.stringify(returnData),
                    totalBondShares: String(totalBondShares),
                    actualBalance: String(actualBalance),
                },
            })
            out.push(f)
        }

        return out
    }

    handleStETHApprovalEvents(txEvent: TransactionEvent): Finding[] {
        const approvalEvents = filterLog(
            txEvent.logs,
            Lido__factory.createInterface().getEvent('Approval').format('full'),
            DEPLOYED_ADDRESSES.LIDO_STETH,
        )

        const out: Finding[] = []
        for (const event of approvalEvents) {
            if (
                event.args.owner === DEPLOYED_ADDRESSES.CS_ACCOUNTING &&
                event.args.spender !== DEPLOYED_ADDRESSES.BURNER
            ) {
                const f = Finding.fromObject({
                    name: `🚨 Unexpected stETH approval from CSAccounting`,
                    description:
                        `${addressOnExplorer(event.args.spender)} received allowance from ` +
                        `${addressOnExplorer(event.args.owner)} for ${event.args.value} stETH`,
                    alertId: 'STETH-APPROVAL',
                    source: sourceFromEvent(txEvent),
                    severity: FindingSeverity.Critical,
                    type: FindingType.Info,
                })
                out.push(f)
            }
        }
        return out
    }

    handleSetBondCurveEvent(txEvent: TransactionEvent): Finding[] {
        const curveSetEvents = filterLog(
            txEvent.logs,
            CSAccounting__factory.createInterface().getEvent('BondCurveSet').format('full'),
            DEPLOYED_ADDRESSES.CS_ACCOUNTING,
        )

        const creationEvents = filterLog(
            txEvent.logs,
            CSModule__factory.createInterface().getEvent('NodeOperatorAdded').format('full'),
            DEPLOYED_ADDRESSES.CS_MODULE,
        )
        const createdIds = creationEvents.map((e) => e.args.nodeOperatorId)

        const out: Finding[] = []

        for (const e of curveSetEvents) {
            if (e.args.curveId == CURVE_DEFAULT_ID) {
                out.push(
                    Finding.fromObject({
                        alertId: 'CS-ACCOUNTING-BOND-CURVE-SET',
                        name: '🔵 CSAccounting: Bond curve set',
                        description: `Bond curve was reset for Node Operator #${e.args.nodeOperatorId}`,
                        source: sourceFromEvent(txEvent),
                        severity: FindingSeverity.Info,
                        type: FindingType.Info,
                    }),
                )
            } else {
                if (
                    e.args.curveId == CURVE_EARLY_ADOPTION_ID &&
                    createdIds.includes(e.args.nodeOperatorId)
                ) {
                    continue
                }

                out.push(
                    Finding.fromObject({
                        alertId: 'CS-ACCOUNTING-BOND-CURVE-SET',
                        name: '🔵 CSAccounting: Bond curve set',
                        description: `Bond curve set for Node Operator #${e.args.nodeOperatorId} with curve ID ${e.args.curveId}`,
                        source: sourceFromEvent(txEvent),
                        severity: FindingSeverity.Info,
                        type: FindingType.Info,
                    }),
                )
            }
        }

        return out
    }

    handleBondBurnedEvent(txEvent: TransactionEvent): Finding[] {
        const bondBurnedEvents = filterLog(
            txEvent.logs,
            CSAccounting__factory.createInterface().getEvent('BondBurned').format('full'),
            DEPLOYED_ADDRESSES.CS_ACCOUNTING,
        )

        const out: Finding[] = []

        for (const e of bondBurnedEvents) {
            if (e.args.toBurnAmount > e.args.burnedAmount + 10n) {
                out.push(
                    Finding.fromObject({
                        alertId: 'CS-ACCOUNTING-PENALTY-HIGHER-THAN-BOND',
                        name: '🔴 CSAccounting: Penalty exceeding bond',
                        description: `Penalty exceeding bond applied for Node Operator #${e.args.nodeOperatorId}`,
                        source: sourceFromEvent(txEvent),
                        severity: FindingSeverity.High,
                        type: FindingType.Info,
                    }),
                )
            }
        }

        return out
    }
}
