import { ETH_DECIMALS } from './constants'
import BigNumber from 'bignumber.js'

export function etherscanNft(address: string, id: number | string): string {
  const subpath = process.env.FORTA_AGENT_RUN_TEAR == 'testnet' ? 'goerli.' : ''
  return `[${id}](https://${subpath}etherscan.io/nft/${address}/${id})`
}

export function etherscanAddress(address: string): string {
  const subpath = process.env.FORTA_AGENT_RUN_TIER == 'testnet' ? 'goerli.' : ''
  return `[${address}](https://${subpath}etherscan.io/address/${address})`
}

export function toEthString(wei: BigNumber): string {
  return wei.dividedBy(ETH_DECIMALS).toFixed(3) + ' ETH'
}