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
import { CSAccounting__factory, CSModule__factory, Lido__factory } from '../../generated/typechain'
import { getLogger } from '../../logger'
import { SECONDS_PER_DAY, WEI_PER_ETH } from '../../shared/constants'
import { sourceFromEvent } from '../../utils/findings'
import { RedefineMode, requireWithTier } from '../../utils/require'
import { formatEther } from '../../utils/string'
import * as Constants from '../constants'

const { DEPLOYED_ADDRESSES } = requireWithTier<typeof Constants>(
    module,
    '../constants',
    RedefineMode.Merge,
)

const CHECK_ACCOUNTING_INTERVAL_BLOCKS = 301 // ~ every hour
const CHECK_OPERATORS_INTERVAL_BLOCKS = 2401 // ~ 3 times a day
const BOND_AVG_WEI_MIN = WEI_PER_ETH * 1n
const LOCK_TOTAL_WEI_MAX = WEI_PER_ETH * 32n
const ACCOUNTING_BALANCE_EXCESS_SHARES_MAX = WEI_PER_ETH / 10n
const CURVE_EARLY_ADOPTION_ID = 1n
const CURVE_DEFAULT_ID = 0n

export class CSAccountingSrv {
    private readonly logger: Logger

    private lastFiredAt = {
        accountingExcessShares: 0,
        totalLockAlert: 0,
        avgBondAlert: 0,
    }

    constructor() {
        this.logger = getLogger(CSAccountingSrv.name)
    }

    async handleBlock(blockEvent: BlockEvent, provider: ethers.Provider): Promise<Finding[]> {
        return [
            ...(await this.checkAccountingSharesDiscrepancy(blockEvent, provider)),
            ...(await this.handleBondAndLockValues(blockEvent, provider)),
        ]
    }

    public async handleTransaction(
        txEvent: TransactionEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        return [
            ...this.handleStETHApprovalEvents(txEvent),
            ...this.handleSetBondCurveEvent(txEvent),
        ]
    }

    public async handleBondAndLockValues(
        blockEvent: BlockEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        if (blockEvent.blockNumber % CHECK_OPERATORS_INTERVAL_BLOCKS !== 0 && !IS_CLI) {
            return []
        }

        const accounting = CSAccounting__factory.connect(DEPLOYED_ADDRESSES.CS_ACCOUNTING, provider)
        const csm = CSModule__factory.connect(DEPLOYED_ADDRESSES.CS_MODULE, provider)
        const ethCallOpts = { blockTag: blockEvent.blockHash }

        const operatorsCount = await csm.getNodeOperatorsCount(ethCallOpts)
        this.logger.debug(`Total operators count: ${operatorsCount}`)

        let totalValidators = 0n
        let totalBondWei = 0n
        let totalLockWei = 0n

        for (let noId = 0; noId < operatorsCount; noId++) {
            totalValidators += await csm.getNodeOperatorNonWithdrawnKeys(noId, ethCallOpts)
            totalBondWei += (await accounting.getBondSummary(noId, ethCallOpts)).current
            totalLockWei += await accounting.getActualLockedBond(noId, ethCallOpts)
        }
        this.logger.debug(`Read ${operatorsCount} operators info`)

        const avgBondWei = totalBondWei / totalValidators

        this.logger.debug(`Averave bond is ${formatEther(avgBondWei)}`)
        this.logger.debug(`Total bond is ${formatEther(totalBondWei)}`)
        this.logger.debug(`Total lock is ${formatEther(totalLockWei)}`)

        const now = blockEvent.block.timestamp
        const out: Finding[] = []

        if (now - this.lastFiredAt.avgBondAlert > SECONDS_PER_DAY) {
            if (avgBondWei < BOND_AVG_WEI_MIN) {
                const f = Finding.fromObject({
                    name: `🟢 CSAccounting: Average bond value for a validator is below threshold.`,
                    description: `Average bond value for a validator is less than ${formatEther(BOND_AVG_WEI_MIN)}`,
                    alertId: 'CS-ACCOUNTING-AVERAGE-BOND-VALUE',
                    // source: sourceFromEvent(blockEvent),
                    severity: FindingSeverity.Low,
                    type: FindingType.Info,
                })

                out.push(f)
                this.lastFiredAt.avgBondAlert = now
            }
        }

        if (now - this.lastFiredAt.totalLockAlert > SECONDS_PER_DAY) {
            if (totalLockWei > LOCK_TOTAL_WEI_MAX) {
                const f = Finding.fromObject({
                    name: `🟢 Total bond lock exceeds threshold.`,
                    description: `Total bond lock is more than ${formatEther(LOCK_TOTAL_WEI_MAX)}`,
                    alertId: 'CS-ACCOUNTING-TOTAL-BOND-LOCK',
                    // NOTE: Do not include the source to reach quorum.
                    // source: sourceFromEvent(blockEvent),
                    severity: FindingSeverity.Low,
                    type: FindingType.Info,
                })

                out.push(f)
                this.lastFiredAt.totalLockAlert = now
            }
        }

        return out
    }

    async checkAccountingSharesDiscrepancy(
        blockEvent: BlockEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        if (blockEvent.blockNumber % CHECK_ACCOUNTING_INTERVAL_BLOCKS !== 0 && !IS_CLI) {
            return []
        }

        const accounting = CSAccounting__factory.connect(DEPLOYED_ADDRESSES.CS_ACCOUNTING, provider)
        const steth = Lido__factory.connect(DEPLOYED_ADDRESSES.LIDO_STETH, provider)

        const totalBondShares = await accounting.totalBondShares({ blockTag: blockEvent.blockHash })
        const actualBalance = await steth.sharesOf(accounting, { blockTag: blockEvent.blockHash })
        const diff = totalBondShares - actualBalance

        const now = blockEvent.block.timestamp
        const out: Finding[] = []

        if (now - this.lastFiredAt.accountingExcessShares > SECONDS_PER_DAY) {
            if (diff > ACCOUNTING_BALANCE_EXCESS_SHARES_MAX) {
                const f = Finding.fromObject({
                    name: `🟢 Shares to recover on CSAccounting.`,
                    description: `There's a valuable amount of shares to recover on CSAccounting.`,
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
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            })
            out.push(f)
        }

        return out
    }

    // TODO: Does it makes sense for us at all?
    handleStETHApprovalEvents(txEvent: TransactionEvent): Finding[] {
        const approvalEvents = filterLog(
            txEvent.logs,
            Lido__factory.createInterface().getEvent('TransferShares').format('full'),
            DEPLOYED_ADDRESSES.LIDO_STETH,
        )

        const out: Finding[] = []
        for (const event of approvalEvents) {
            if (event.args.owner === DEPLOYED_ADDRESSES.CS_ACCOUNTING) {
                const f = Finding.fromObject({
                    name: `🔵 Lido stETH: Approval`,
                    description: `${event.args.spender} received allowance from ${event.args.owner} to ${event.args.value}`,
                    alertId: 'STETH-APPROVAL',
                    source: sourceFromEvent(txEvent),
                    severity: FindingSeverity.Low,
                    type: FindingType.Info,
                })
                out.push(f)
            }
        }
        return out
    }

    handleSetBondCurveEvent(txEvent: TransactionEvent): Finding[] {
        const events = filterLog(
            txEvent.logs,
            CSAccounting__factory.createInterface().getEvent('BondCurveSet').format('full'),
            DEPLOYED_ADDRESSES.CS_ACCOUNTING,
        )

        const out: Finding[] = []

        for (const e of events) {
            if (e.args.curveId == CURVE_EARLY_ADOPTION_ID) {
                out.push(
                    Finding.fromObject({
                        alertId: 'CS-ACCOUNTING-BOND-CURVE-SET',
                        name: '🔵 CSAccounting: Bond curve set',
                        description: `Early adoption bond curve set for Node Operator #${e.args.nodeOperatorId}`,
                        source: sourceFromEvent(txEvent),
                        severity: FindingSeverity.Info,
                        type: FindingType.Info,
                    }),
                )
            } else if (e.args.curveId == CURVE_DEFAULT_ID) {
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
}
