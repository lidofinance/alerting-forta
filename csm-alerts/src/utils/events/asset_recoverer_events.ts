import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { Finding } from '../../generated/proto/alert_pb'

interface ContractWithAssetRecoverer {
  name: string
  address: string
  functions: Map<string, string>
}

export function getAssetRecovererEvents(CONTRACTS_WITH_ASSET_RECOVERER: ContractWithAssetRecoverer[]): EventOfNotice[] {
  return CONTRACTS_WITH_ASSET_RECOVERER.flatMap((ContractWithAssetRecovererInfo: ContractWithAssetRecoverer) => {
    return [
      {
        address: ContractWithAssetRecovererInfo.address,
        abi: 'event ERC20Recovered(address indexed token, address indexed recipient, uint256 amount)',
        alertId: 'ASSET-RECOVERER-ERC20-RECOVERED',
        name: '🔴 AssetRecoverer: ERC20 recovered',
        description: (args: Result) =>
          `ERC20 recovered on ${ContractWithAssetRecovererInfo.name}:\n` +
          `Recipient: ${etherscanAddress(args.recipient)}\n` +
          `Token: ${etherscanAddress(args.token)}\n` +
          `Amount: ${args.amount}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: ContractWithAssetRecovererInfo.address,
        abi: 'event ERC721Recovered(address indexed token, uint256 tokenId, address indexed recipient)',
        alertId: 'ASSET-RECOVERER-ERC721-RECOVERED',
        name: '🔴 AssetRecoverer: ERC721 recovered',
        description: (args: Result) =>
          `ERC721 recovered on ${ContractWithAssetRecovererInfo.name}:\n` +
          `Recipient: ${etherscanAddress(args.recipient)}\n` +
          `Token: ${etherscanAddress(args.token)}\n` +
          `Token ID: ${args.tokenId}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: ContractWithAssetRecovererInfo.address,
        abi: 'event ERC1155Recovered(address indexed token, uint256 tokenId, address indexed recipient, uint256 amount)',
        alertId: 'ASSET-RECOVERER-ERC1155-RECOVERED',
        name: '🔴 AssetRecoverer: ERC1155 recovered',
        description: (args: Result) =>
          `ERC1155 recovered on ${ContractWithAssetRecovererInfo.name}:\n` +
          `Recipient: ${etherscanAddress(args.recipient)}\n` +
          `Token: ${etherscanAddress(args.token)}\n` +
          `Token ID: ${args.tokenId}\n` +
          `Amount: ${args.amount}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: ContractWithAssetRecovererInfo.address,
        abi: 'event EtherRecovered(address indexed recipient, uint256 amount)',
        alertId: 'ASSET-RECOVERER-ETHER-RECOVERED',
        name: '🔴 AssetRecoverer: Ether recovered',
        description: (args: Result) =>
          `Ether recovered on ${ContractWithAssetRecovererInfo.name}:\n` +
          `Recipient: ${etherscanAddress(args.recipient)}\n` +
          `Amount: ${args.amount}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: ContractWithAssetRecovererInfo.address,
        abi: 'event StETHSharesRecovered(address indexed recipient, uint256 shares)',
        alertId: 'ASSET-RECOVERER-STETH-SHARES-RECOVERED',
        name: '🔴 AssetRecoverer: StETH Shares recovered',
        description: (args: Result) =>
          `StETH Shares recovered on ${ContractWithAssetRecovererInfo.name}:\n` +
          `Recipient: ${etherscanAddress(args.recipient)}\n` +
          `Shares: ${args.shares}`,
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      },
    ]
  })
}
