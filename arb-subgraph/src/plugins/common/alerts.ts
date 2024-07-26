import { Logger } from 'winston'
import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'

import {
  InitializeRequest,
  InitializeResponse,
  ResponseStatus,
  EvaluateAlertRequest,
  EvaluateAlertResponse,
} from '../../generated/proto/agent_pb'
import { Finding } from '../../generated/proto/alert_pb'
import Version from '../../utils/version'
import { elapsedTime } from '../../utils'
import { LOW_BALANCE_FINDING } from '../../constants'

declare module 'fastify' {
  interface FastifyInstance {
    alerts: Alerts
  }
}

export class Alerts {
  private readonly logger: Logger
  private readonly appName: string

  private onAppStartFindings: Finding[] = []

  constructor(appName: string, logger: Logger, onAppStartFindings: Finding[]) {
    this.appName = appName
    this.logger = logger
    this.onAppStartFindings = onAppStartFindings
  }

  public initialization() {
    return async (
      _call: ServerUnaryCall<InitializeRequest, InitializeResponse>,
      callback: sendUnaryData<InitializeResponse>,
    ) => {
      const startTime = new Date().getTime()

      const f: Finding = new Finding()
      f.setName(`${this.appName} launched`)
      f.setDescription(`Version: ${Version.desc}`)
      f.setAlertid('LIDO-AGENT-LAUNCHED')
      f.setSeverity(Finding.Severity.INFO)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      const m = f.getMetadataMap()
      m.set('version.commitHash', Version.commitHash)
      m.set('version.commitMsg', Version.commitMsg)

      this.logger.info(elapsedTime('L2 bridge arbitrum started', startTime) + '\n')

      this.onAppStartFindings.push(f)
      const resp = new InitializeResponse()
      resp.setStatus(ResponseStatus.SUCCESS)

      callback(null, resp)
    }
  }

  public lowBalance(args: { name: string; description: string; metadata: { [key: string]: string } }): Finding {
    const { name, description, metadata } = args

    const f: Finding = new Finding()
    f.setName(name)
    f.setDescription(description)
    f.setAlertid(LOW_BALANCE_FINDING)
    f.setSeverity(Finding.Severity.HIGH)
    f.setType(Finding.FindingType.DEGRADED)
    f.setProtocol('ethereum')

    const m = f.getMetadataMap()
    for (const key in metadata) {
      m.set(key, metadata[key])
    }

    return f
  }

  public handleAlert() {
    return async (
      _call: ServerUnaryCall<EvaluateAlertRequest, EvaluateAlertResponse>,
      callback: sendUnaryData<EvaluateAlertResponse>,
    ) => {
      const resp = new EvaluateAlertResponse()
      resp.setStatus(ResponseStatus.SUCCESS)
      resp.setFindingsList([])
      resp.setTimestamp(new Date().toISOString())

      callback(null, resp)
    }
  }
}

const fastifyAlerts: FastifyPluginAsync = async (fastify) => {
  const { logger } = fastify

  const alerts = new Alerts('arb-subgraph', fastify.logger, [])

  logger.info('Alerts plugin initialized')

  if (!fastify.alerts) {
    fastify.decorate('alerts', alerts)
  }
}

export default fp(fastifyAlerts, '4.x')
