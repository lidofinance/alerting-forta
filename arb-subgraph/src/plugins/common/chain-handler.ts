import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyInstance } from 'fastify'
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import BigNumber from 'bignumber.js'

import { EvaluateBlockRequest, EvaluateBlockResponse, ResponseStatus } from '../../generated/proto/agent_pb'
import { Finding } from '../../generated/proto/alert_pb'
import { elapsedTime } from '../../utils'

declare module 'fastify' {
  interface FastifyInstance {
    chainHandler: ChainHandler
  }
}

type BlockDto = {
  number: number
  timestamp: number
  parentHash: string
  hash: string
}

export class ChainHandler {
  private fastify: FastifyInstance

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify
  }

  public handleBlock() {
    return async (
      call: ServerUnaryCall<EvaluateBlockRequest, EvaluateBlockResponse>,
      callback: sendUnaryData<EvaluateBlockResponse>,
    ) => {
      const {
        handleBlock: handleBlockLabel,
        statusOk: statusOkLabel,
        statusFail: statusFailLabel,
      } = this.fastify.metrics.labels

      this.fastify.metrics.lastAgentTouch.labels({ method: handleBlockLabel }).set(new Date().getTime())
      const end = this.fastify.metrics.summaryHandlers.labels({ method: handleBlockLabel }).startTimer()

      const event = call.request.getEvent()
      const block = event?.getBlock()

      if (!block) {
        const blockResponse = new EvaluateBlockResponse()
        blockResponse.setStatus(ResponseStatus.ERROR)
        blockResponse.setPrivate(false)
        blockResponse.setFindingsList([])
        const blockMetadata = blockResponse.getMetadataMap()
        blockMetadata.set('timestamp', new Date().toISOString())

        end()
        return callback(null, blockResponse)
      }

      const l2blockDtoEvent: BlockDto = {
        number: new BigNumber(block.getNumber(), 10).toNumber(),
        timestamp: new BigNumber(block.getTimestamp(), 10).toNumber(),
        parentHash: block.getParenthash(),
        hash: block.getHash(),
      }

      const findings: Finding[] = []

      this.fastify.logger.info(`#arbitrum block: ${l2blockDtoEvent.number}`)
      const startTime = new Date().getTime()

      const finding = await this.fastify.balanceChecker.checkSubgraphBalance(
        l2blockDtoEvent.timestamp,
        l2blockDtoEvent.number,
      )
      if (finding) {
        findings.push(finding)
      }

      const errCount = this.fastify.healthChecker.check(findings)
      errCount === 0
        ? this.fastify.metrics.processedIterations.labels({ method: handleBlockLabel, status: statusOkLabel }).inc()
        : this.fastify.metrics.processedIterations.labels({ method: handleBlockLabel, status: statusFailLabel }).inc()

      const blockResponse = new EvaluateBlockResponse()
      blockResponse.setStatus(ResponseStatus.SUCCESS)
      blockResponse.setPrivate(false)
      blockResponse.setFindingsList(findings)
      const blockMetadata = blockResponse.getMetadataMap()
      blockMetadata.set('timestamp', new Date().toISOString())

      this.fastify.logger.info(elapsedTime('handleBlock', startTime) + '\n')
      this.fastify.metrics.lastBlockNumber.set(l2blockDtoEvent.number)

      end()
      callback(null, blockResponse)
    }
  }
}

const fastifyChainHandler: FastifyPluginAsync = async (fastify) => {
  const { logger } = fastify

  const chainHandler = new ChainHandler(fastify)

  logger.info('ChainHandler plugin initialized')

  if (!fastify.chainHandler) {
    fastify.decorate('chainHandler', chainHandler)
  }
}

export default fp(fastifyChainHandler, '4.x')
