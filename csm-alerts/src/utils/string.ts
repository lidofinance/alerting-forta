import { ethers } from '@fortanetwork/forta-bot'

import { RUN_TIER } from '../config'
import { SHARES_PRECISION, WEI_PER_ETH } from '../shared/constants'

export function etherscanAddress(address: string): string {
    const subpath = RUN_TIER == 'holesky' ? 'holesky.' : ''
    return `[${address}](https://${subpath}etherscan.io/address/${address})`
}

export function toKebabCase(str: string): string {
    return str.replace(/_/g, '-')
}

export function formatShares(amount: bigint): string {
    amount = amount - (amount % (SHARES_PRECISION / 100n))
    return `${ethers.formatEther(amount)} × 1e18 shares`
}

export function formatEther(amount: bigint): string {
    amount = amount - (amount % (WEI_PER_ETH / 100n))
    return `${ethers.formatEther(amount)} ether`
}

export function ipfsLink(cid: string): string {
    return `[${cid}](https://ipfs.io/ipfs/${cid})`
}
