import BigNumber from 'bignumber.js'

export type ERC20 = {
  decimals: number
  name: string
}

export const RUN_TIER = process.env.FORTA_AGENT_RUN_TIER

export const ETH_DECIMALS = new BigNumber(10).pow(18)

export const DEPOSIT_SECURITY_ADDRESS = '0xc77f8768774e1c9244beed705c4354f2113cfc09'

export const BURNER_ADDRESS = '0xd15a672319cf0352560ee76d9e89eab0889046d3'
export const LDO_ADDRESS = '0x5a98fcbea516cf06857215779fd812ca3bef1b32'
export const LIDO_STETH_ADDRESS = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'
export const WSTETH_ADDRESS = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'

export const WITHDRAWAL_QUEUE_ADDRESS = '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1'

export const DEPOSIT_EXECUTOR_ADDRESS = '0xf82ac5937a20dc862f9bc0668779031e06000f17'

export const INSURANCE_FUND_ADDRESS = '0x8b3f33234abd88493c0cd28de33d583b70bede35'

export const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f'
export const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'
export const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

export const KNOWN_ERC20 = new Map<string, ERC20>([
  [LIDO_STETH_ADDRESS, { decimals: 18, name: 'stETH' }],
  [WSTETH_ADDRESS, { decimals: 18, name: 'wstETH' }],
  [LDO_ADDRESS, { decimals: 18, name: 'LDO' }],
  [DAI_ADDRESS, { decimals: 18, name: 'DAI' }],
  [USDT_ADDRESS, { decimals: 6, name: 'USDT' }],
  [USDC_ADDRESS, { decimals: 6, name: 'USDC' }],
])
