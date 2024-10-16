import { FindingSeverity, FindingType } from '@fortanetwork/forta-bot'

import { CSFeeDistributor__factory } from '../../../generated/typechain'
import * as CSFeeDistributor from '../../../generated/typechain/CSFeeDistributor'
import { EventOfNotice } from '../../../shared/types'
import { ipfsLink } from '../../../utils/string'

const ICSFeeDistributor = CSFeeDistributor__factory.createInterface()

export function getCSFeeDistributorEvents(distributorAddress: string): EventOfNotice[] {
    return [
        {
            address: distributorAddress,
            abi: ICSFeeDistributor.getEvent('DistributionDataUpdated').format('full'),
            alertId: 'CSFEE-DISTRIBUTOR-DISTRIBUTION-DATA-UPDATED',
            name: '🔵 CSFeeDistributor: Distribution data updated',
            description: (args: CSFeeDistributor.DistributionDataUpdatedEvent.OutputObject) =>
                `Total Claimable Shares: ${args.totalClaimableShares}\n` +
                `Tree Root: ${args.treeRoot}\n` +
                `Tree CID: ${ipfsLink(args.treeCid)}`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
        },
        {
            address: distributorAddress,
            abi: ICSFeeDistributor.getEvent('DistributionLogUpdated').format('full'),
            alertId: 'CSFEE-DISTRIBUTOR-DISTRIBUTION-LOG-UPDATED',
            name: '🔵 CSFeeDistributor: Distribution log updated',
            description: (args: CSFeeDistributor.DistributionLogUpdatedEvent.OutputObject) =>
                `Log CID: ${ipfsLink(args.logCid)}`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
        },
    ]
}
