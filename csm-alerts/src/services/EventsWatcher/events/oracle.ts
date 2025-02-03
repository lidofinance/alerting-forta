import { FindingSeverity, FindingType } from '@fortanetwork/forta-bot'

import { CSFeeOracle__factory } from '../../../generated/typechain'
import * as CSFeeOracle from '../../../generated/typechain/CSFeeOracle'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress } from '../../../utils/string'

const ICSFeeOracle = CSFeeOracle__factory.createInterface()

export function getCSFeeOracleEvents(address: string): EventOfNotice[] {
    return [
        {
            address,
            abi: ICSFeeOracle.getEvent('PerfLeewaySet').format('full'),
            alertId: 'CSFEE-ORACLE-PERF-LEEWAY-SET',
            name: '🔴 CSFeeOracle: Performance leeway updated',
            description: (args: CSFeeOracle.PerfLeewaySetEvent.OutputObject) =>
                `Performance leeway set to ${args.valueBP} basis points`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: ICSFeeOracle.getEvent('FeeDistributorContractSet').format('full'),
            alertId: 'CSFEE-ORACLE-FEE-DISTRIBUTOR-CONTRACT-SET',
            name: '🚨 CSFeeOracle: New CSFeeDistributor set',
            description: (args: CSFeeOracle.FeeDistributorContractSetEvent.OutputObject) =>
                `New CSFeeDistributor contract set to ${etherscanAddress(args.feeDistributorContract)}`,
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
        },
        {
            address,
            abi: ICSFeeOracle.getEvent('ConsensusHashContractSet').format('full'),
            alertId: 'CSFEE-ORACLE-CONSENSUS-HASH-CONTRACT-SET',
            name: '🚨 CSFeeOracle: Consensus hash contract set',
            description: (args: CSFeeOracle.ConsensusHashContractSetEvent.OutputObject) =>
                `Consensus hash contract set to ${etherscanAddress(args.addr)}, ` +
                `previous contract was ${etherscanAddress(args.prevAddr)}`,
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
        },
        {
            address,
            abi: ICSFeeOracle.getEvent('ConsensusVersionSet').format('full'),
            alertId: 'CSFEE-ORACLE-CONSENSUS-VERSION-SET',
            name: '🔴 CSFeeOracle: Consensus version set',
            description: (args: CSFeeOracle.ConsensusVersionSetEvent.OutputObject) =>
                `Consensus version set to ${args.version}, previous version was ${args.prevVersion}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: ICSFeeOracle.getEvent('WarnProcessingMissed').format('full'),
            alertId: 'CSFEE-ORACLE-PROCESSING-MISSED',
            name: '🔴 CSFeeOracle: Processing missed',
            description: (args: CSFeeOracle.WarnProcessingMissedEvent.OutputObject) =>
                `Processing missed for slot ${args.refSlot}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: ICSFeeOracle.getEvent('ReportSubmitted').format('full'),
            alertId: 'CSFEE-ORACLE-REPORT-SUBMITTED',
            name: '🔵 CSFeeOracle: Report submitted',
            description: (args: CSFeeOracle.ReportSubmittedEvent.OutputObject) =>
                `Report submitted for slot ${args.refSlot}\n` +
                `Report hash: ${args.hash}\n` +
                `Processing deadline time: ${args.processingDeadlineTime}`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
        },
    ]
}
