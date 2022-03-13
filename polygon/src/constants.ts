import BigNumber from 'bignumber.js'
import {
    FindingSeverity,
} from 'forta-agent'

// COMMON CONSTS
export const MATIC_DECIMALS = new BigNumber(10 ** 18)

// 24 hours
export const FULL_24_HOURS = 24 * 60 * 60

// ADDRESSES
export const MATIC_TOKEN_ADDRESS = '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0'
export const ST_MATIC_TOKEN_ADDRESS = '0x9ee91f9f426fa633d227f7a9b000e28b9dfd8599'
export const NODE_OPERATORS_REGISTRY_ADDRESS = '0x797c1369e578172112526dfcd0d5f9182067c928'

// THRESHOLDS
// 3.1% MATIC of total pooled MATIC
export const MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT = 3.1

// 1.1% MATIC of total pooled MATIC
export const MAX_BUFFERED_MATIC_DAILY_PERCENT = 1.1
