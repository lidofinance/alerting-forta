import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyInstance } from 'fastify'
import BigNumber from 'bignumber.js'

import { Finding } from '../generated/proto/alert_pb'
import { Billing__factory } from '../generated/typechain/factories/Billing__factory'
import {
  BILLING_ADDRESS,
  BLOCK_INTERVAL,
  ETH_DECIMALS,
  GRAPH_BALANCE_THRESHOLD,
  LIDO_VAULT_ADDRESS,
  REPORT_WINDOW_GRAPH_BALANCE,
} from '../constants'

declare module 'fastify' {
  interface FastifyInstance {
    balanceChecker: BalanceChecker
  }
}

export class BalanceChecker {
  private fastify: FastifyInstance
  private lastReportedGraphBalance: number = 0

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify
  }

  public async checkSubgraphBalance(now: number, blockNumber: number): Promise<Finding | null> {
    if (this.lastReportedGraphBalance + REPORT_WINDOW_GRAPH_BALANCE >= now && blockNumber % BLOCK_INTERVAL !== 0) {
      return null
    }

    const subgraphBillingContract = Billing__factory.connect(BILLING_ADDRESS, this.fastify.provider)
    const balance = new BigNumber(String(await subgraphBillingContract.functions.userBalances(LIDO_VAULT_ADDRESS))).div(
      ETH_DECIMALS,
    )

    if (balance.isLessThanOrEqualTo(GRAPH_BALANCE_THRESHOLD)) {
      this.lastReportedGraphBalance = now

      return this.fastify.alerts.lowBalance({
        name: '🚨 Low balance of Lido account on The Graph',
        description: `Balance is ${balance.toFixed(2)} GRT. It is too low!`,
        metadata: {
          balance: balance.toFixed(2),
          lido_vault_address: LIDO_VAULT_ADDRESS,
        },
      })
    }

    return null
  }
}

const fastifyBalanceChecker: FastifyPluginAsync = async (fastify) => {
  const { logger } = fastify

  const balanceChecker = new BalanceChecker(fastify)

  logger.info('BalanceChecker plugin initialized')

  if (!fastify.balanceChecker) {
    fastify.decorate('balanceChecker', balanceChecker)
  }
}

export default fp(fastifyBalanceChecker, '4.x')
