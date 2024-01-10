import BigNumber from 'bignumber.js'

export const RUN_TIER = process.env.FORTA_AGENT_RUN_TIER

export const ETH_DECIMALS = new BigNumber(10).pow(18)

export const DEPOSIT_SECURITY_ADDRESS = '0xc77f8768774e1c9244beed705c4354f2113cfc09'

export const LIDO_STETH_ADDRESS = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'

export const WITHDRAWAL_QUEUE_ADDRESS = '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1'
