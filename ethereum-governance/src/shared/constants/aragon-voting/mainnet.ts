import { ONE_HOUR } from '../../time'

// Perform ad-hoc votes info refresh each BLOCK_WINDOW blocks
export const BLOCK_WINDOW = 1000

// Number of blocks for the whole 5 days
export const FIVE_DAYS_BLOCKS = Math.floor((ONE_HOUR * 24 * 5) / 12)

// 46 hours
export const TRIGGER_AFTER = 46 * ONE_HOUR

// 48 hours
export const PHASE_ONE_DURATION = 48 * ONE_HOUR
