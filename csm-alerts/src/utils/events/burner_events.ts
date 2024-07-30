import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { Finding } from '../../generated/proto/alert_pb'
import { CSM_PROXY_CONTRACTS, Proxy } from '../constants.holesky'

export function getBurnerEvents(): EventOfNotice[] {
  return CSM_PROXY_CONTRACTS.flatMap((proxyInfo: Proxy) => {
    return [
      {
        address: proxyInfo.name,
        abi: 'event ERC20Recovered(address indexed token, address indexed recipient, uint256 amount)',
        alertId: 'ASSET-RECOVERER-ERC20-RECOVERED',
        name: '🔴 AssetRecoverer: ERC20 recovered',
        description: (args: Result) =>
          `ERC20 recovered:\n` +
          `Recipient: ${etherscanAddress(args.recipient)}\n` +
          `Token: ${etherscanAddress(args.token)}\n` +
          `Amount: ${args.amount}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: proxyInfo.name,
        abi: 'event ERC721Recovered(address indexed token, uint256 tokenId, address indexed recipient)',
        alertId: 'ASSET-RECOVERER-ERC721-RECOVERED',
        name: '🔴 AssetRecoverer: ERC721 recovered',
        description: (args: Result) =>
          `ERC721 recovered:\n` +
          `Recipient: ${etherscanAddress(args.recipient)}\n` +
          `Token: ${etherscanAddress(args.token)}\n` +
          `Token ID: ${args.tokenId}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: proxyInfo.name,
        abi: 'event ERC1155Recovered(address indexed token, uint256 tokenId, address indexed recipient, uint256 amount)',
        alertId: 'ASSET-RECOVERER-ERC1155-RECOVERED',
        name: '🔴 AssetRecoverer: ERC1155 recovered',
        description: (args: Result) =>
          `ERC1155 recovered:\n` +
          `Recipient: ${etherscanAddress(args.recipient)}\n` +
          `Token: ${etherscanAddress(args.token)}\n` +
          `Token ID: ${args.tokenId}\n` +
          `Amount: ${args.amount}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: proxyInfo.name,
        abi: 'event EtherRecovered(address indexed recipient, uint256 amount)',
        alertId: 'ASSET-RECOVERER-ETHER-RECOVERED',
        name: '🔴 AssetRecoverer: Ether recovered',
        description: (args: Result) =>
          `Ether recovered:\n` + `Recipient: ${etherscanAddress(args.recipient)}\n` + `Amount: ${args.amount}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: proxyInfo.name,
        abi: 'event StETHSharesRecovered(address indexed recipient, uint256 shares)',
        alertId: 'ASSET-RECOVERER-STETH-SHARES-RECOVERED',
        name: '🔴 AssetRecoverer: StETH Shares recovered',
        description: (args: Result) =>
          `StETH Shares recovered:\n` + `Recipient: ${etherscanAddress(args.recipient)}\n` + `Shares: ${args.shares}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
    ]
  })
}
