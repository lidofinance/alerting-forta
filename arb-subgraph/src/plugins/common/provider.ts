import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { ethers, getEthersProvider } from 'forta-agent'

import { ENVS } from '../../env'

declare module 'fastify' {
  interface FastifyInstance {
    provider: ethers.providers.JsonRpcProvider
  }
}

const fastifyProvider: FastifyPluginAsync = async (fastify) => {
  const { logger } = fastify
  const { ARBITRUM_RPC_URL, FORTA_CHAIN_ID, USE_FORTA_PROVIDER } = fastify.getEnvs<ENVS>()

  const arbitrumProvider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC_URL, FORTA_CHAIN_ID)
  let provider = getEthersProvider()
  if (!USE_FORTA_PROVIDER) {
    provider = arbitrumProvider
  }

  logger.info(`Provider plugin initialized with ${USE_FORTA_PROVIDER ? 'Forta' : 'Arbitrum RPC'} provider`)

  if (!fastify.provider) {
    fastify.decorate('provider', provider)
  }
}

export default fp(fastifyProvider, '4.x')
