import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { Finding } from '../../generated/proto/alert_pb'

export const TRANSFER_SHARES_EVENT =
  'event TransferShares(address indexed from, address indexed to, uint256 sharesValue)'
export const DISTRIBUTION_DATA_UPDATED_EVENT =
  'event DistributionDataUpdated(uint256 totalClaimableShares, bytes32 treeRoot, string treeCid)'

export function getCSFeeDistributorEvents(CS_FEE_DISTRIBUTOR_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: CS_FEE_DISTRIBUTOR_ADDRESS,
      abi: DISTRIBUTION_DATA_UPDATED_EVENT,
      alertId: 'CSFEE-DISTRIBUTOR-DISTRIBUTION-DATA-UPDATED',
      name: '🔵 CSFeeDistributor: Distribution data updated',
      description: (args: Result) =>
        `Distribution data updated:\n` +
        `Total Claimable Shares: ${args.totalClaimableShares}\n` +
        `Tree Root: ${args.treeRoot}\n` +
        `Tree CID: ${args.treeCid}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
