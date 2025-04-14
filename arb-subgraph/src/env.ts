export type ENVS = {
  ARBITRUM_RPC_URL: string
  APP_NAME: string
  NODE_ENV: string
  INSTANCE: string
  AGENT_GRPC_PORT: number
  HTTP_PORT: number
  LOG_FORMAT: string
  LOG_LEVEL: string
  FORTA_CHAIN_ID: number
  USE_FORTA_PROVIDER: boolean
}

const ENV_SCHEME = {
  type: 'object',
  required: ['ARBITRUM_RPC_URL'],
  properties: {
    APP_NAME: {
      type: 'string',
      default: 'arb-subgraph',
    },
    NODE_ENV: {
      type: 'string',
      default: 'production',
    },
    INSTANCE: {
      type: 'string',
      default: 'forta',
    },
    ARBITRUM_RPC_URL: {
      type: 'string',
    },
    AGENT_GRPC_PORT: {
      type: 'number',
      default: 50051,
    },
    HTTP_PORT: {
      type: 'number',
      default: 3000,
    },
    LOG_FORMAT: {
      type: 'string',
      default: 'simple',
    },
    LOG_LEVEL: {
      type: 'string',
      default: 'info',
    },
    FORTA_CHAIN_ID: {
      type: 'number',
      default: 42161,
    },
    USE_FORTA_PROVIDER: {
      type: 'boolean',
      default: false,
    },
  },
}

export const ENV_OPTIONS = {
  dotenv: true,
  schema: ENV_SCHEME,
}
