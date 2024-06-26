import BigNumber from 'bignumber.js'

export type ERC20 = {
  decimals: number
  name: string
}
export type Address = {
  STETH_ADDRESS: string
  AAVE_ASTETH_ADDRESS: string
  AAVE_STABLE_DEBT_STETH_ADDRESS: string
  AAVE_VARIABLE_DEBT_STETH_ADDRESS: string
  CURVE_POOL_ADDRESS: string
  CHAINLINK_STETH_PRICE_FEED: string
}
export const ETH_DECIMALS = new BigNumber(10).pow(18)

const STETH_ADDRESS: string = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'
const AAVE_ASTETH_ADDRESS: string = '0x1982b2f5814301d4e9a8b0201555376e62f82428'
const AAVE_STABLE_DEBT_STETH_ADDRESS: string = '0x66457616dd8489df5d0afd8678f4a260088aaf55'
const AAVE_VARIABLE_DEBT_STETH_ADDRESS: string = '0xa9deac9f00dc4310c35603fcd9d34d1a750f81db'

const CURVE_POOL_ADDRESS: string = '0xdc24316b9ae028f1497c275eb9192a3ea0f67022'
const CHAINLINK_STETH_PRICE_FEED: string = '0x86392dC19c0b719886221c78AB11eb8Cf5c52812'

export const Address: Address = {
  STETH_ADDRESS: STETH_ADDRESS,
  AAVE_ASTETH_ADDRESS: AAVE_ASTETH_ADDRESS,
  AAVE_STABLE_DEBT_STETH_ADDRESS: AAVE_STABLE_DEBT_STETH_ADDRESS,
  AAVE_VARIABLE_DEBT_STETH_ADDRESS: AAVE_VARIABLE_DEBT_STETH_ADDRESS,
  CURVE_POOL_ADDRESS: CURVE_POOL_ADDRESS,
  CHAINLINK_STETH_PRICE_FEED: CHAINLINK_STETH_PRICE_FEED,
}
