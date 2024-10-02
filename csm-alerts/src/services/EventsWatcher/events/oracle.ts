import { FindingSeverity, FindingType, ethers } from '@fortanetwork/forta-bot'

import { CSFeeOracle__factory, HashConsensus__factory } from '../../../generated/typechain'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress } from '../../../utils/string'

const IHashConsensus = HashConsensus__factory.createInterface()
const ICSFeeOracle = CSFeeOracle__factory.createInterface()

export function getHashConsensusEvents(address: string, knownMembers: { [key: string]: string }): EventOfNotice[] {
  return [
    {
      address,
      abi: IHashConsensus.getEvent('MemberAdded').format('full'),
      alertId: 'HASH-CONSENSUS-MEMBER-ADDED',
      name: '🔴 HashConsensus: Member added',
      description: (args: ethers.Result) =>
        `New member ${etherscanAddress(args.addr)} (${knownMembers[args.addr] ?? 'unknown'}) added\n` +
        `Total members: ${args.newTotalMembers}\n` +
        `New quorum: ${args.newQuorum}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: IHashConsensus.getEvent('MemberRemoved').format('full'),
      alertId: 'HASH-CONSENSUS-MEMBER-REMOVED',
      name: '🔴 HashConsensus: Member removed',
      description: (args: ethers.Result) =>
        `Member ${etherscanAddress(args.addr)} (${knownMembers[args.addr] ?? 'unknown'}) removed\n` +
        `Total members: ${args.newTotalMembers}\n` +
        `New quorum: ${args.newQuorum}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: IHashConsensus.getEvent('QuorumSet').format('full'),
      alertId: 'HASH-CONSENSUS-QUORUM-SET',
      name: '🔴 HashConsensus: Quorum set',
      description: (args: ethers.Result) =>
        `Quorum set to ${args.newQuorum}.\n` +
        `Total members: ${args.totalMembers}\n` +
        `Previous quorum: ${args.prevQuorum}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: IHashConsensus.getEvent('FastLaneConfigSet').format('full'),
      alertId: 'HASH-CONSENSUS-FASTLANE-CONFIG-SET',
      name: '🔴 HashConsensus: Fastlane config set',
      description: (args: ethers.Result) => `Fastlane configuration set with length slots: ${args.fastLaneLengthSlots}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: IHashConsensus.getEvent('FrameConfigSet').format('full'),
      alertId: 'HASH-CONSENSUS-FRAME-CONFIG-SET',
      name: '🔴 HashConsensus: Frame config set',
      description: (args: ethers.Result) =>
        `Frame configuration set.\n` +
        `New initial epoch: ${args.newInitialEpoch}\n` +
        `Epochs per frame: ${args.newEpochsPerFrame}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: IHashConsensus.getEvent('ReportProcessorSet').format('full'),
      alertId: 'HASH-CONSENSUS-REPORT-PROCESSOR-SET',
      name: '🔴 HashConsensus: Report processor set',
      description: (args: ethers.Result) =>
        `Current processor: ${etherscanAddress(args.processor)}\nPrevious processor: ${etherscanAddress(args.prevProcessor)}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: IHashConsensus.getEvent('ConsensusLost').format('full'),
      alertId: 'HASH-CONSENSUS-LOST',
      name: '🔴 HashConsensus: Consensus lost',
      description: (args: ethers.Result) => `Consensus lost for slot ${args.refSlot}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: IHashConsensus.getEvent('ConsensusReached').format('full'),
      alertId: 'HASH-CONSENSUS-REACHED',
      name: '🔵 HashConsensus: Consensus reached, report received',
      // prettier-ignore
      description: (args: ethers.Result) =>
        `Consensus reached for slot ${args.refSlot}\n` +
        `Report hash: ${args.report}\n` +
        `Support: ${args.support}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
  ]
}

export function getCSFeeOracleEvents(address: string): EventOfNotice[] {
  return [
    {
      address,
      abi: ICSFeeOracle.getEvent('ConsensusHashContractSet').format('full'),
      alertId: 'CSFEE-ORACLE-CONSENSUS-HASH-CONTRACT-SET',
      name: '🚨 CSFeeOracle: Consensus hash contract set',
      description: (args: ethers.Result) =>
        `Consensus hash contract set to ${etherscanAddress(args.addr)}, previous contract was ${etherscanAddress(args.prevAddr)}`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address,
      abi: ICSFeeOracle.getEvent('PerfLeewaySet').format('full'),
      alertId: 'CSFEE-ORACLE-PERF-LEEWAY-SET',
      name: '🔴 CSFeeOracle: Performance leeway updated',
      description: (args: ethers.Result) => `Performance leeway set to ${args.valueBP} basis points`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: ICSFeeOracle.getEvent('FeeDistributorContractSet').format('full'),
      alertId: 'CSFEE-ORACLE-FEE-DISTRIBUTOR-CONTRACT-SET',
      name: '🔴 CSFeeOracle: New CSFeeDistributor set',
      description: (args: ethers.Result) =>
        `New CSFeeDistributor contract set to ${etherscanAddress(args.feeDistributorContract)}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: ICSFeeOracle.getEvent('ConsensusVersionSet').format('full'),
      alertId: 'CSFEE-ORACLE-CONSENSUS-VERSION-SET',
      name: '🔴 CSFeeOracle: Consensus version set',
      description: (args: ethers.Result) =>
        `Consensus version set to ${args.version}, previous version was ${args.prevVersion}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address,
      abi: ICSFeeOracle.getEvent('WarnProcessingMissed').format('full'),
      alertId: 'CSFEE-ORACLE-PROCESSING-MISSED',
      name: '🔵 CSFeeOracle: Processing missed',
      description: (args: ethers.Result) => `Processing missed for slot ${args.refSlot}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
    {
      address,
      abi: ICSFeeOracle.getEvent('ReportSubmitted').format('full'),
      alertId: 'CSFEE-ORACLE-REPORT-SUBMITTED',
      name: '🔵 CSFeeOracle: Report submitted',
      description: (args: ethers.Result) =>
        `Report submitted for slot ${args.refSlot}\n` +
        `Report hash: ${args.hash}\n` +
        `Processing deadline time: ${args.processingDeadlineTime}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
    {
      address,
      abi: ICSFeeOracle.getEvent('ProcessingStarted').format('full'),
      alertId: 'CSFEE-ORACLE-PROCESSING-STARTED',
      name: '🔵 CSFeeOracle: Processing started',
      description: (args: ethers.Result) => `Processing started for slot ${args.refSlot}\nReport hash: ${args.hash}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
  ]
}
