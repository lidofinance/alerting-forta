export const RUN_TIER = process.env.FORTA_AGENT_RUN_TIER || null
export const APP_NAME = process.env.APP_NAME || 'csm-alerts'
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
export const LOG_FORMAT = process.env.LOG_FORMAT || 'simple'
export const IS_CLI = !!(process.env.FORTA_CLI_BLOCK || process.env.FORTA_CLI_TX)
