import { FindingSeverity, FindingType } from '@fortanetwork/forta-bot'

import { HashConsensus__factory } from '../../../generated/typechain'
import * as HashConsensus from '../../../generated/typechain/HashConsensus'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress } from '../../../utils/string'

const IHashConsensus = HashConsensus__factory.createInterface()

export function getHashConsensusEvents(
    address: string,
    knownMembers: { [key: string]: string },
): EventOfNotice[] {
    return [
        {
            address,
            abi: IHashConsensus.getEvent('MemberAdded').format('full'),
            alertId: 'HASH-CONSENSUS-MEMBER-ADDED',
            name: '🔴 CSM HashConsensus: Member added',
            description: (args: HashConsensus.MemberAddedEvent.OutputObject) =>
                `New member ${etherscanAddress(args.addr)} (${knownMembers[args.addr] ?? 'unknown'}) added\n` +
                `Total members: ${args.newTotalMembers}\n` +
                `New quorum: ${args.newQuorum}\n` +
                `Contract: ${etherscanAddress(address)}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: IHashConsensus.getEvent('MemberRemoved').format('full'),
            alertId: 'HASH-CONSENSUS-MEMBER-REMOVED',
            name: '🔴 CSM HashConsensus: Member removed',
            description: (args: HashConsensus.MemberRemovedEvent.OutputObject) =>
                `Member ${etherscanAddress(args.addr)} (${knownMembers[args.addr] ?? 'unknown'}) removed\n` +
                `Total members: ${args.newTotalMembers}\n` +
                `New quorum: ${args.newQuorum}\n` +
                `Contract: ${etherscanAddress(address)}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: IHashConsensus.getEvent('QuorumSet').format('full'),
            alertId: 'HASH-CONSENSUS-QUORUM-SET',
            name: '🔴 CSM HashConsensus: Quorum set',
            description: (args: HashConsensus.QuorumSetEvent.OutputObject) =>
                `Quorum set to ${args.newQuorum}.\n` +
                `Total members: ${args.totalMembers}\n` +
                `Previous quorum: ${args.prevQuorum}\n` +
                `Contract: ${etherscanAddress(address)}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: IHashConsensus.getEvent('FastLaneConfigSet').format('full'),
            alertId: 'HASH-CONSENSUS-FASTLANE-CONFIG-SET',
            name: '🔴 CSM HashConsensus: Fastlane config set',
            description: (args: HashConsensus.FastLaneConfigSetEvent.OutputObject) =>
                `Fastlane configuration set with length slots: ${args.fastLaneLengthSlots}\n` +
                `Contract: ${etherscanAddress(address)}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: IHashConsensus.getEvent('FrameConfigSet').format('full'),
            alertId: 'HASH-CONSENSUS-FRAME-CONFIG-SET',
            name: '🔴 CSM HashConsensus: Frame config set',
            description: (args: HashConsensus.FrameConfigSetEvent.OutputObject) =>
                `Frame configuration set:\n` +
                `New initial epoch: ${args.newInitialEpoch}\n` +
                `Epochs per frame: ${args.newEpochsPerFrame}\n` +
                `Contract: ${etherscanAddress(address)}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: IHashConsensus.getEvent('ReportProcessorSet').format('full'),
            alertId: 'HASH-CONSENSUS-REPORT-PROCESSOR-SET',
            name: '🔴 CSM HashConsensus: Report processor set',
            description: (args: HashConsensus.ReportProcessorSetEvent.OutputObject) =>
                `Previous processor: ${etherscanAddress(args.prevProcessor)}\n` +
                `Current processor: ${etherscanAddress(args.processor)}\n` +
                `Contract: ${etherscanAddress(address)}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: IHashConsensus.getEvent('ConsensusLost').format('full'),
            alertId: 'HASH-CONSENSUS-LOST',
            name: '🔴 CSM HashConsensus: Consensus lost',
            description: (args: HashConsensus.ConsensusLostEvent.OutputObject) =>
                `Consensus lost for slot ${args.refSlot}\n` +
                `Contract: ${etherscanAddress(address)}`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
        {
            address,
            abi: IHashConsensus.getEvent('ConsensusReached').format('full'),
            alertId: 'HASH-CONSENSUS-REACHED',
            name: '🔵 CSM HashConsensus: Consensus reached',
            description: (args: HashConsensus.ConsensusReachedEvent.OutputObject) =>
                `Consensus reached for slot ${args.refSlot}\n` +
                `Report hash: ${args.report}\n` +
                `Support: ${args.support}\n` +
                `Contract: ${etherscanAddress(address)}`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
        },
    ]
}
