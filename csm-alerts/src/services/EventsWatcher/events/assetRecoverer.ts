import { FindingSeverity, FindingType, ethers } from '@fortanetwork/forta-bot'

import { AssetRecoverer__factory } from '../../../generated/typechain'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress, formatEther, formatShares } from '../../../utils/string'

const IAssetRecoverer = AssetRecoverer__factory.createInterface()

export function getAssetRecovererEvents(
    contracts: { name: string; address: string }[],
): EventOfNotice[] {
    return contracts.flatMap((contract) => {
        return [
            {
                address: contract.address,
                abi: IAssetRecoverer.getEvent('ERC20Recovered').format('full'),
                alertId: 'ASSET-RECOVERER-ERC20-RECOVERED',
                name: '🔴 AssetRecoverer: ERC20 recovered',
                description: (args: ethers.Result) =>
                    `ERC20 recovered on ${contract.name}:\n` +
                    `Recipient: ${etherscanAddress(args.recipient)}\n` +
                    `Token: ${etherscanAddress(args.token)}\n` +
                    `Amount: ${args.amount}`,
                severity: FindingSeverity.High,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IAssetRecoverer.getEvent('ERC721Recovered').format('full'),
                alertId: 'ASSET-RECOVERER-ERC721-RECOVERED',
                name: '🔴 AssetRecoverer: ERC721 recovered',
                description: (args: ethers.Result) =>
                    `ERC721 recovered on ${contract.name}:\n` +
                    `Recipient: ${etherscanAddress(args.recipient)}\n` +
                    `Token: ${etherscanAddress(args.token)}\n` +
                    `Token ID: ${args.tokenId}`,
                severity: FindingSeverity.High,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IAssetRecoverer.getEvent('ERC1155Recovered').format('full'),
                alertId: 'ASSET-RECOVERER-ERC1155-RECOVERED',
                name: '🔴 AssetRecoverer: ERC1155 recovered',
                description: (args: ethers.Result) =>
                    `ERC1155 recovered on ${contract.name}:\n` +
                    `Recipient: ${etherscanAddress(args.recipient)}\n` +
                    `Token: ${etherscanAddress(args.token)}\n` +
                    `Token ID: ${args.tokenId}\n` +
                    `Amount: ${args.amount}`,
                severity: FindingSeverity.High,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IAssetRecoverer.getEvent('EtherRecovered').format('full'),
                alertId: 'ASSET-RECOVERER-ETHER-RECOVERED',
                name: '🔴 AssetRecoverer: Ether recovered',
                description: (args: ethers.Result) =>
                    `Ether recovered on ${contract.name}:\n` +
                    `Recipient: ${etherscanAddress(args.recipient)}\n` +
                    `Amount: ${formatEther(args.amount)}`,
                severity: FindingSeverity.High,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IAssetRecoverer.getEvent('StETHSharesRecovered').format('full'),
                alertId: 'ASSET-RECOVERER-STETH-SHARES-RECOVERED',
                name: '🔴 AssetRecoverer: StETH Shares recovered',
                description: (args: ethers.Result) =>
                    `StETH Shares recovered on ${contract.name}:\n` +
                    `Recipient: ${etherscanAddress(args.recipient)}\n` +
                    `Amount: ${formatShares(args.shares)}`,
                severity: FindingSeverity.High,
                type: FindingType.Info,
            },
        ]
    })
}
