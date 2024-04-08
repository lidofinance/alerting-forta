import { keccak256 } from 'forta-agent'
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

export const getMotionType = (types: Map<string, string>, evmScriptFactory: string) => {
  return types.get(evmScriptFactory.toLowerCase()) || 'New '
}

export const getMotionLink = (motionId: string) => {
  return `[${motionId}](https://easytrack.lido.fi/motions/${motionId})`
}

export interface INamedRole {
  name: string
  hash: string
}

export const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

export function roleByName(name: string): INamedRole {
  let hash = keccak256(name)

  if (name === 'DEFAULT_ADMIN_ROLE') {
    hash = DEFAULT_ADMIN_ROLE
  }

  return {
    name: name.replace(/_/g, ' '),
    hash,
  }
}
