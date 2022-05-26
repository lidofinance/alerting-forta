import BigNumber from 'bignumber.js'


// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18)


// ADDRESSES AND EVENTS

export const LIDO_ADDRESS = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84' // should be lowercase

export const SUBMITTED_EVENT = 'event Submitted(address indexed sender, uint256 amount, address referral)'
