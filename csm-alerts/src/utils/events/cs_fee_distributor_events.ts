import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { Finding } from '../../generated/proto/alert_pb'

export function getCSFeeDistributorEvents(
  CS_FEE_DISTRIBUTOR_ADDRESS: string,
  CS_ACCOUNTING_ADDRESS: string,
): EventOfNotice[] {
  return [
    {
      address: CS_FEE_DISTRIBUTOR_ADDRESS,
      abi: 'event TransferShares(address indexed from, address indexed to, uint256 value)',
      alertId: 'CSFEE-DISTRIBUTOR-INVALID-TRANSFER',
      name: '🟣 CSFeeDistributor: Invalid TransferShares receiver',
      description: (args: Result) => {
        const from = etherscanAddress(args.from)
        const to = etherscanAddress(args.to)
        if (from === CS_FEE_DISTRIBUTOR_ADDRESS && to !== CS_ACCOUNTING_ADDRESS) {
          return `TransferShares from CSFeeDistributor to an invalid address ${to} (expected CSAccounting)`
        }
        return null
      },
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_FEE_DISTRIBUTOR_ADDRESS,
      abi: 'event DistributionDataUpdated(uint256 indexed refSlot, bytes32 reportHash, uint256 distributed)',
      alertId: 'CSFEE-DISTRIBUTOR-DISTRIBUTION-DATA-UPDATED',
      name: '🔵 CSFeeDistributor: Distribution data updated',
      description: (args: Result) =>
        `Oracle settled a new report for slot ${args.refSlot}. Report hash: ${args.reportHash}, Distributed amount: ${args.distributed}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
