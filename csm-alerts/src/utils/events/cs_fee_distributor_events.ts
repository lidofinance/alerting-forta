import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { Finding } from '../../generated/proto/alert_pb'

export function getCSFeeDistributorEvents(CS_FEE_DISTRIBUTOR_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: CS_FEE_DISTRIBUTOR_ADDRESS,
      abi: 'event TransferShares(address indexed from, address indexed to, uint256 value)',
      alertId: 'CSFEE-DISTRIBUTOR-INVALID-TRANSFER',
      name: '🟣 CSFeeDistributor: Invalid TransferShares receiver',
      description: (args: Result) =>
        `TransferShares from CSFeeDistributor to an invalid address ${args.to} (expected CSAccounting)`,
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_DISTRIBUTOR_ADDRESS,
      abi: 'event DistributionDataUpdated(uint256 totalClaimableShares, bytes32 treeRoot, string treeCid)',
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
