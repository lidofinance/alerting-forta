import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { Finding } from '../../generated/proto/alert_pb'

export function getBurnerEvents(BURNER_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: BURNER_ADDRESS,
      abi: 'event ERC20Recovered(address indexed requestedBy, address indexed token,uint256 amount)',
      alertId: 'LIDO-BURNER-ERC20-RECOVERED',
      name: '🔴 Lido Burner: ERC20 recovered',
      description: (args: Result) =>
        `ERC20 recovered:\n` +
        `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
        `Token: ${etherscanAddress(args.token)}\n` +
        `Amount: ${args.amount}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: BURNER_ADDRESS,
      abi: 'event ERC721Recovered(address indexed requestedBy, address indexed token, uint256 tokenId)',
      alertId: 'LIDO-BURNER-ERC721-RECOVERED',
      name: '🔴 Lido Burner: ERC721 recovered',
      description: (args: Result) =>
        `ERC721 recovered:\n` +
        `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
        `Token: ${etherscanAddress(args.token)}\n` +
        `Token ID: ${args.tokenId}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: BURNER_ADDRESS,
      abi: 'event ERC1155Recovered(address indexed requestedBy, address indexed token, uint256 tokenId)',
      alertId: 'LIDO-BURNER-ERC1155-RECOVERED',
      name: '🔴 Lido Burner: ERC1155 recovered',
      description: (args: Result) =>
        `ERC1155 recovered:\n` +
        `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
        `Token: ${etherscanAddress(args.token)}\n` +
        `Token ID: ${args.tokenId}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: BURNER_ADDRESS,
      abi: 'event EtherRecovered(address indexed requestedBy, address indexed token, uint256 tokenId)',
      alertId: 'LIDO-BURNER-ETHER-RECOVERED',
      name: '🔴 Lido Burner: Ether recovered',
      description: (args: Result) =>
        `Ether recovered:\n` +
        `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
        `Token: ${etherscanAddress(args.token)}\n` +
        `Token ID: ${args.tokenId}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: BURNER_ADDRESS,
      abi: 'event StETHSharesRecovered(address indexed requestedBy, address indexed token, uint256 tokenId)',
      alertId: 'LIDO-BURNER-STETH-SHARES-RECOVERED',
      name: '🔴 Lido Burner: StETH Shares recovered',
      description: (args: Result) =>
        `StETH Shares recovered:\n` +
        `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
        `Token: ${etherscanAddress(args.token)}\n` +
        `Token ID: ${args.tokenId}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
