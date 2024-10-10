import { FindingSeverity, FindingType, ethers } from '@fortanetwork/forta-bot'

import { CSFeeDistributor__factory } from '../../../generated/typechain'
import { EventOfNotice } from '../../../shared/types'

const ICSFeeDistributor = CSFeeDistributor__factory.createInterface()

export function getCSFeeDistributorEvents(distributorAddress: string): EventOfNotice[] {
    return [
        {
            address: distributorAddress,
            abi: ICSFeeDistributor.getEvent('DistributionDataUpdated').format('full'),
            alertId: 'CSFEE-DISTRIBUTOR-DISTRIBUTION-DATA-UPDATED',
            name: '🔵 CSFeeDistributor: Distribution data updated',
            description: (args: ethers.Result) =>
                `Total Claimable Shares: ${args.totalClaimableShares}\n` +
                `Tree Root: ${args.treeRoot}\n` +
                `Tree CID: ${args.treeCid}`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
        },
        {
            address: distributorAddress,
            abi: ICSFeeDistributor.getEvent('DistributionLogUpdated').format('full'),
            alertId: 'CSFEE-DISTRIBUTOR-DISTRIBUTION-LOG-UPDATED',
            name: '🔵 CSFeeDistributor: Distribution log updated',
            description: (args: ethers.Result) => `Log CID: ${args.logCid}`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
        },
    ]
}
