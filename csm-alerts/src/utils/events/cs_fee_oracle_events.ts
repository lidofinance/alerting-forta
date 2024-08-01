import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { Finding } from '../../generated/proto/alert_pb'

export const HASH_CONSENSUS_REPORT_RECEIVED_EVENT =
  'event ReportReceived(uint256 indexed refSlot, address indexed member, bytes32 report)'

export function getHashConsensusEvents(HASH_CONSENSUS_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: HASH_CONSENSUS_ADDRESS,
      abi: 'event MemberAdded(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)',
      alertId: 'HASH-CONSENSUS-MEMBER-ADDED',
      name: '🔴 HashConsensus: Member added',
      description: (args: Result) =>
        `New member ${etherscanAddress(args.addr)} added. Total members: ${args.newTotalMembers}, New quorum: ${args.newQuorum}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: HASH_CONSENSUS_ADDRESS,
      abi: 'event MemberRemoved(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)',
      alertId: 'HASH-CONSENSUS-MEMBER-REMOVED',
      name: '🔴 HashConsensus: Member removed',
      description: (args: Result) =>
        `Member ${etherscanAddress(args.addr)} removed. Total members: ${args.newTotalMembers}, New quorum: ${args.newQuorum}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: HASH_CONSENSUS_ADDRESS,
      abi: 'event QuorumSet(uint256 newQuorum, uint256 totalMembers, uint256 prevQuorum)',
      alertId: 'HASH-CONSENSUS-QUORUM-SET',
      name: '🔴 HashConsensus: Quorum set',
      description: (args: Result) =>
        `Quorum set to ${args.newQuorum}. Total members: ${args.totalMembers}, Previous quorum: ${args.prevQuorum}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: HASH_CONSENSUS_ADDRESS,
      abi: 'event FastLaneConfigSet(uint256 fastLaneLengthSlots)',
      alertId: 'HASH-CONSENSUS-FASTLANE-CONFIG-SET',
      name: '🔴 HashConsensus: Fastlane config set',
      description: (args: Result) => `Fastlane configuration set with length slots: ${args.fastLaneLengthSlots}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: HASH_CONSENSUS_ADDRESS,
      abi: 'event FrameConfigSet(uint256 newInitialEpoch, uint256 newEpochsPerFrame)',
      alertId: 'HASH-CONSENSUS-FRAME-CONFIG-SET',
      name: '🔴 HashConsensus: Frame config set',
      description: (args: Result) =>
        `Frame configuration set. New initial epoch: ${args.newInitialEpoch}, Epochs per frame: ${args.newEpochsPerFrame}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: HASH_CONSENSUS_ADDRESS,
      abi: 'event ReportProcessorSet(address indexed processor, address indexed prevProcessor)',
      alertId: 'HASH-CONSENSUS-REPORT-PROCESSOR-SET',
      name: '🔴 HashConsensus: Report processor set',
      description: (args: Result) =>
        `Report processor set. New processor: ${etherscanAddress(args.processor)}, Previous processor: ${etherscanAddress(args.prevProcessor)}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: HASH_CONSENSUS_ADDRESS,
      abi: 'event ConsensusLost(uint256 indexed refSlot)',
      alertId: 'HASH-CONSENSUS-LOST',
      name: '🔴 HashConsensus: Consensus lost',
      description: (args: Result) => `Consensus lost for slot ${args.refSlot}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: HASH_CONSENSUS_ADDRESS,
      abi: 'event ConsensusReached(uint256 indexed refSlot, bytes32 report, uint256 support)',
      alertId: 'HASH-CONSENSUS-REACHED',
      name: '🔵 HashConsensus: Consensus reached, report received',
      description: (args: Result) =>
        `Consensus reached for slot ${args.refSlot}. Report hash: ${args.report}, Support: ${args.support}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}

export function getCSFeeOracleEvents(CS_FEE_ORACLE_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: CS_FEE_ORACLE_ADDRESS,
      abi: 'event ConsensusHashContractSet(address indexed addr, address indexed prevAddr)',
      alertId: 'CSFEE-ORACLE-CONSENSUS-HASH-CONTRACT-SET',
      name: '🚨 CSFeeOracle: Consensus hash contract set',
      description: (args: Result) =>
        `Consensus hash contract set to ${etherscanAddress(args.addr)}, previous contract was ${etherscanAddress(args.prevAddr)}`,
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_ORACLE_ADDRESS,
      abi: 'event PerfLeewaySet(uint256 valueBP)',
      alertId: 'CSFEE-ORACLE-PERF-LEEWAY-SET',
      name: '🔴 CSFeeOracle: Performance leeway updated',
      description: (args: Result) => `Performance leeway set to ${args.valueBP} basis points`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_ORACLE_ADDRESS,
      abi: 'event FeeDistributorContractSet(address feeDistributorContract)',
      alertId: 'CSFEE-ORACLE-FEE-DISTRIBUTOR-CONTRACT-SET',
      name: '🔴 CSFeeOracle: New CSFeeDistributor set',
      description: (args: Result) =>
        `New CSFeeDistributor contract set to ${etherscanAddress(args.feeDistributorContract)}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_ORACLE_ADDRESS,
      abi: 'event ConsensusVersionSet(uint256 indexed version, uint256 indexed prevVersion)',
      alertId: 'CSFEE-ORACLE-CONSENSUS-VERSION-SET',
      name: '🔴 CSFeeOracle: Consensus version set',
      description: (args: Result) =>
        `Consensus version set to ${args.version}, previous version was ${args.prevVersion}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_ORACLE_ADDRESS,
      abi: 'event WarnProcessingMissed(uint256 indexed refSlot)',
      alertId: 'CSFEE-ORACLE-PROCESSING-MISSED',
      name: '🔴 CSFeeOracle: Processing missed',
      description: (args: Result) => `Processing missed for slot ${args.refSlot}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_ORACLE_ADDRESS,
      abi: 'event ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)',
      alertId: 'CSFEE-ORACLE-REPORT-SUBMITTED',
      name: '🔵 CSFeeOracle: Report submitted',
      description: (args: Result) =>
        `Report submitted for slot ${args.refSlot}. Hash: ${args.hash}, Processing deadline time: ${args.processingDeadlineTime}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_ORACLE_ADDRESS,
      abi: 'event ProcessingStarted(uint256 indexed refSlot, bytes32 hash)',
      alertId: 'CSFEE-ORACLE-PROCESSING-STARTED',
      name: '🔵 CSFeeOracle: Processing started',
      description: (args: Result) => `Processing started for slot ${args.refSlot}. Hash: ${args.hash}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_ORACLE_ADDRESS,
      abi: 'event ReportSettled(uint256 indexed refSlot, uint256 distributed, bytes32 treeRoot, string treeCid)',
      alertId: 'CSFEE-ORACLE-REPORT-SETTLED',
      name: '🔵 CSFeeOracle: Report settled',
      description: (args: Result) =>
        `Report settled for slot ${args.refSlot}. Distributed: ${args.distributed}, Tree root: ${args.treeRoot}, Tree CID: ${args.treeCid}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
