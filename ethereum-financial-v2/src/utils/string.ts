import { ETH_DECIMALS } from './constants'
import BigNumber from 'bignumber.js'
export function toEthString(wei: BigNumber): string {
  return wei.dividedBy(ETH_DECIMALS).toFixed(3) + ' ETH'
}
