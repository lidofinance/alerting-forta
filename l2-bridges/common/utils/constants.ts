import BigNumber from 'bignumber.js'

export type WithdrawalInfo = {
  eventName: string,
  eventDefinition: string,  // e.g. "event WithdawalEvent(address indexed l1token, ...)"
}

export const ETH_DECIMALS = new BigNumber(10).pow(18)
export const MAINNET_CHAIN_ID = 1
export const DRPC_URL = 'https://eth.drpc.org/'
