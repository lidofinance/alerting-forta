import { ETH_DECIMALS } from './constants'
import BigNumber from 'bignumber.js'

export function etherscanAddress(address: string): string {
  const subpath = process.env.FORTA_AGENT_RUN_TIER == 'testnet' ? 'holesky.' : ''
  return `[${address}](https://${subpath}etherscan.io/address/${address})`
}

export function toEthString(wei: BigNumber): string {
  return wei.dividedBy(ETH_DECIMALS).toFixed(3) + ' ETH'
}

export function toKebabCase(str: string): string {
  return str.replace(/_/g, '-')
}
