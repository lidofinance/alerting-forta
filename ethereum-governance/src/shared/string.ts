import { keccak256 } from 'forta-agent'
import BigNumber from 'bignumber.js'
import { BigNumberish, utils } from 'ethers'

function getSubpathForNetwork(): string {
  const runTier = process.env.FORTA_AGENT_RUN_TIER
  if (runTier === 'testnet') {
    return `goerli.`
  }
  if (runTier && runTier !== 'mainnet') {
    return `${runTier}.`
  }
  return ''
}

export function etherscanAddress(address: string, text = address): string {
  return `[${text}](https://${getSubpathForNetwork()}etherscan.io/address/${address})`
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

export function formatAmount(amount: unknown, decimals: number, dp: number = 2): string {
  return new BigNumber(String(amount)).div(new BigNumber(10).pow(decimals)).toFixed(dp)
}

export const formatToken = (amount: BigNumberish, decimals: BigNumberish): string => {
  const amountStr = utils.formatUnits(amount, decimals)

  const formatter = new Intl.NumberFormat('en', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })

  return formatter.format(parseFloat(amountStr))
}

export const formatEth = (amount: BigNumberish): string => formatToken(amount, 18)
