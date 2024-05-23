import BigNumber from 'bignumber.js'
export type ERC20 = {
  decimals: number
  name: string
}

export type Address = {
  DEPOSIT_SECURITY_ADDRESS: string
  BURNER_ADDRESS: string
  LDO_ADDRESS: string
  LIDO_STETH_ADDRESS: string
  WSTETH_ADDRESS: string
  WITHDRAWALS_QUEUE_ADDRESS: string
  DEPOSIT_EXECUTOR_ADDRESS: string
  INSURANCE_FUND_ADDRESS: string
  DAI_ADDRESS: string
  USDT_ADDRESS: string
  USDC_ADDRESS: string
  GATE_SEAL_DEFAULT_ADDRESS: string
  EXIT_BUS_ORACLE_ADDRESS: string
  GATE_SEAL_FACTORY_ADDRESS: string
  WITHDRAWALS_VAULT_ADDRESS: string
  EL_REWARDS_VAULT_ADDRESS: string
  KNOWN_ERC20: Map<string, ERC20>

  ENS_BASE_REGISTRAR_ADDRESS: string
}

export const ETH_DECIMALS = new BigNumber(10).pow(18)

const DEPOSIT_SECURITY_ADDRESS: string = '0xc77f8768774e1c9244beed705c4354f2113cfc09'
const BURNER_ADDRESS: string = '0xd15a672319cf0352560ee76d9e89eab0889046d3'
const LDO_ADDRESS: string = '0x5a98fcbea516cf06857215779fd812ca3bef1b32'
const LIDO_STETH_ADDRESS: string = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'
const WSTETH_ADDRESS: string = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'
const WITHDRAWALS_QUEUE_ADDRESS: string = '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1'
const DEPOSIT_EXECUTOR_ADDRESS: string = '0xf82ac5937a20dc862f9bc0668779031e06000f17'
const INSURANCE_FUND_ADDRESS: string = '0x8b3f33234abd88493c0cd28de33d583b70bede35'
const DAI_ADDRESS: string = '0x6b175474e89094c44da98b954eedeac495271d0f'
const USDT_ADDRESS: string = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const USDC_ADDRESS: string = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const GATE_SEAL_DEFAULT_ADDRESS: string = '0x79243345eDbe01A7E42EDfF5900156700d22611c'
const EXITBUS_ORACLE_ADDRESS: string = '0x0de4ea0184c2ad0baca7183356aea5b8d5bf5c6e'
const GATE_SEAL_FACTORY_ADDRESS: string = '0x6c82877cac5a7a739f16ca0a89c0a328b8764a24'
const WITHDRAWALS_VAULT_ADDRESS: string = '0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f'
const EL_REWARDS_VAULT_ADDRESS: string = '0x388c818ca8b9251b393131c08a736a67ccb19297'

const ENS_BASE_REGISTRAR_ADDRESS = '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85'

const KNOWN_ERC20 = new Map<string, ERC20>([
  [LIDO_STETH_ADDRESS, { decimals: 18, name: 'stETH' }],
  [WSTETH_ADDRESS, { decimals: 18, name: 'wstETH' }],
  [LDO_ADDRESS, { decimals: 18, name: 'LDO' }],
  [DAI_ADDRESS, { decimals: 18, name: 'DAI' }],
  [USDT_ADDRESS, { decimals: 6, name: 'USDT' }],
  [USDC_ADDRESS, { decimals: 6, name: 'USDC' }],
])

export const Address: Address = {
  DEPOSIT_SECURITY_ADDRESS,
  BURNER_ADDRESS,
  LDO_ADDRESS,
  LIDO_STETH_ADDRESS,
  WSTETH_ADDRESS,
  WITHDRAWALS_QUEUE_ADDRESS,
  DEPOSIT_EXECUTOR_ADDRESS,
  INSURANCE_FUND_ADDRESS,
  DAI_ADDRESS,
  USDT_ADDRESS,
  USDC_ADDRESS,
  GATE_SEAL_DEFAULT_ADDRESS,
  EXIT_BUS_ORACLE_ADDRESS: EXITBUS_ORACLE_ADDRESS,
  GATE_SEAL_FACTORY_ADDRESS,
  WITHDRAWALS_VAULT_ADDRESS,
  EL_REWARDS_VAULT_ADDRESS,
  KNOWN_ERC20,
  ENS_BASE_REGISTRAR_ADDRESS,
}