import BigNumber from 'bignumber.js'


// COMMON CONSTS

// 1 LDO
export const LDO_DECIMALS = new BigNumber(10).pow(18)


// ADDRESSES AND EVENTS

export const EASY_TRACK_ADDRESS = '0xf0211b7660680b49de1a7e9f25c65660f0a13fea'
export const TOP_UP_REWARDS_ADDRESS = '0x77781a93c4824d2299a38ac8bbb11eb3cd6bc3b7'

export const MOTION_CREATED_EVENT = 'event MotionCreated(uint256 indexed _motionId, address _creator, address indexed _evmScriptFactory, bytes _evmScriptCallData, bytes _evmScript)'
export const MOTION_ENACTED_EVENT = 'event MotionEnacted(uint256 indexed _motionId)'
