import { Finding, FindingSeverity, FindingType, TransactionEvent, ethers, filterLog } from '@fortanetwork/forta-bot'

import { CSFeeOracle__factory, HashConsensus__factory } from '../../generated/typechain'
import { sourceFromEvent } from '../../utils/findings'
import { RedefineMode, requireWithTier } from '../../utils/require'
import { etherscanAddress } from '../../utils/string'
import * as Constants from '../constants'

const { DEPLOYED_ADDRESSES, ORACLE_MEMBERS } = requireWithTier<typeof Constants>(
  module,
  '../constants',
  RedefineMode.Merge,
)
const IHashConsensus = HashConsensus__factory.createInterface()
const ICSFeeOracle = CSFeeOracle__factory.createInterface()

// TODO: Extract HashConsensus part maybe?

export class CSFeeOracleSrv {
  private membersLastReport: Map<
    string,
    {
      refSlot: bigint
      report: string
    }
  > = new Map()

  public async initialize(blockIdentifier: ethers.BlockTag, provider: ethers.Provider): Promise<void> {
    const hc = HashConsensus__factory.connect(DEPLOYED_ADDRESSES.HASH_CONSENSUS, provider)
    const [members] = await hc.getMembers({ blockTag: blockIdentifier })
    for (const m of members) {
      const lastReport = await hc.getConsensusStateForMember(m, { blockTag: blockIdentifier })
      this.membersLastReport.set(m, {
        refSlot: lastReport.lastMemberReportRefSlot,
        report: lastReport.currentFrameMemberReport,
      })
    }
  }

  public async handleTransaction(txEvent: TransactionEvent, provider: ethers.Provider): Promise<Finding[]> {
    return [...this.handleAlternativeHashReceived(txEvent), ...(await this.handleReportSubmitted(txEvent, provider))]
  }

  private handleAlternativeHashReceived(txEvent: TransactionEvent): Finding[] {
    const out: Finding[] = []

    const [event] = filterLog(
      txEvent.logs,
      IHashConsensus.getEvent('ReportReceived').format('full'),
      DEPLOYED_ADDRESSES.HASH_CONSENSUS,
    )

    if (event) {
      const currentReportHashes = [...this.membersLastReport.values()]
        .filter((r) => r.refSlot === event.args.refSlot)
        .map((r) => r.report)

      if (currentReportHashes.length > 0 && !currentReportHashes.includes(event.args.report)) {
        const f = Finding.fromObject({
          name: '🔴 HashConsensus: Another report variant appeared (alternative hash)',
          description: `More than one distinct report hash received for slot ${event.args.refSlot}. Member: ${event.args.member}. Report: ${event.args.report}`,
          alertId: 'HASH-CONSENSUS-REPORT-RECEIVED',
          source: sourceFromEvent(txEvent),
          severity: FindingSeverity.High,
          type: FindingType.Info,
        })

        out.push(f)
      }

      this.membersLastReport.set(event.args.member, {
        refSlot: event.args.refSlot,
        report: event.args.report,
      })
    }

    return out
  }

  private async handleReportSubmitted(txEvent: TransactionEvent, provider: ethers.Provider): Promise<Finding[]> {
    const [event] = filterLog(
      txEvent.logs,
      ICSFeeOracle.getEvent('ReportSubmitted').format('full'),
      DEPLOYED_ADDRESSES.CS_FEE_ORACLE,
    )

    if (!event) {
      return []
    }

    const out: Finding[] = []

    const hc = HashConsensus__factory.connect(DEPLOYED_ADDRESSES.HASH_CONSENSUS, provider)
    const [addresses, lastReportedRefSlots] = await hc.getFastLaneMembers({ blockTag: txEvent.block.hash })
    addresses.forEach(function (addr, index) {
      if (event.args.refSlot !== lastReportedRefSlots[index]) {
        out.push(
          Finding.fromObject({
            name: '🔴 CSM: Sloppy oracle fast lane member',
            description: `Member ${etherscanAddress(addr)} (${ORACLE_MEMBERS[addr] || 'unknown'}) was in the fast lane but did not report`,
            alertId: 'HASH-CONSENSUS-SLOPPY-MEMBER',
            source: sourceFromEvent(txEvent),
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          }),
        )
      }
    })

    return out
  }
}
