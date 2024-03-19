import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { Error as gError, InitializeRequest, InitializeResponse, ResponseStatus } from '../proto/agent_pb'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { WithdrawalsSrv } from '../services/withdrawals/Withdrawals.srv'
import { StethOperationSrv } from '../services/steth_operation/StethOperation.srv'
import { GateSealSrv } from '../services/gate-seal/GateSeal.srv'
import { VaultSrv } from '../services/vault/Vault.srv'
import { Metadata } from '../entity/metadata'
import Version from '../utils/version'
import { ETHProvider } from '../clients/eth_provider'
import { elapsedTime } from '../utils/time'
import { ETH_DECIMALS } from '../utils/constants'

export class InitHandler {
  private readonly ethClient: ETHProvider
  private readonly logger: Logger
  private readonly StethOperationSrv: StethOperationSrv
  private readonly WithdrawalsSrv: WithdrawalsSrv
  private readonly GateSealSrv: GateSealSrv
  private readonly VaultSrv: VaultSrv

  private onAppStartFindings: Finding[]

  constructor(
    ethClient: ETHProvider,
    logger: Logger,
    StethOperationSrv: StethOperationSrv,
    WithdrawalsSrv: WithdrawalsSrv,
    GateSealSrv: GateSealSrv,
    VaultSrv: VaultSrv,
    onAppStartFindings: Finding[],
  ) {
    this.ethClient = ethClient
    this.logger = logger
    this.StethOperationSrv = StethOperationSrv
    this.WithdrawalsSrv = WithdrawalsSrv
    this.GateSealSrv = GateSealSrv
    this.VaultSrv = VaultSrv
    this.onAppStartFindings = onAppStartFindings
  }

  public handleInit() {
    return async (
      call: ServerUnaryCall<InitializeRequest, InitializeResponse>,
      callback: sendUnaryData<InitializeResponse>,
    ) => {
      const startTime = new Date().getTime()

      const metadata: Metadata = {
        'version.commitHash': Version.commitHash,
        'version.commitMsg': Version.commitMsg,
      }

      const latestBlockNumber = await this.ethClient.getBlockNumber()
      if (E.isLeft(latestBlockNumber)) {
        this.logger.error(latestBlockNumber.left)

        const resp = new InitializeResponse()
        const err: gError = new gError()
        err.setMessage(latestBlockNumber.left.message)

        resp.setStatus(ResponseStatus.ERROR)
        resp.addErrors(err)

        callback(null, resp)
        return
      }

      const [stethOperationSrvErr, withdrawalsSrvErr, gateSealSrvErr] = await Promise.all([
        this.StethOperationSrv.initialize(latestBlockNumber.right),
        this.WithdrawalsSrv.initialize(latestBlockNumber.right),
        this.GateSealSrv.initialize(latestBlockNumber.right),
        this.VaultSrv.initialize(latestBlockNumber.right),
      ])
      if (stethOperationSrvErr !== null) {
        this.logger.error('Could not init stethSrv', stethOperationSrvErr)

        const resp = new InitializeResponse()
        const err: gError = new gError()
        err.setMessage(stethOperationSrvErr.message)

        resp.setStatus(ResponseStatus.ERROR)
        resp.addErrors(err)

        callback(null, resp)
        return
      }

      if (withdrawalsSrvErr !== null) {
        this.logger.error('Could not init withdrawalsSrvErr', withdrawalsSrvErr)

        const resp = new InitializeResponse()
        const err: gError = new gError()
        err.setMessage(withdrawalsSrvErr.message)

        resp.setStatus(ResponseStatus.ERROR)
        resp.addErrors(err)

        callback(null, resp)
        return
      }

      if (gateSealSrvErr instanceof Error) {
        this.logger.error('Could not init gateSealSrvErr', gateSealSrvErr)

        const resp = new InitializeResponse()
        const err: gError = new gError()
        err.setMessage(gateSealSrvErr.message)

        resp.setStatus(ResponseStatus.ERROR)
        resp.addErrors(err)

        callback(null, resp)
        return
      } else {
        this.onAppStartFindings.push(...gateSealSrvErr)
      }

      const agents: string[] = [
        this.StethOperationSrv.getName(),
        this.WithdrawalsSrv.getName(),
        this.GateSealSrv.getName(),
        this.VaultSrv.getName(),
      ]
      metadata.agents = '[' + agents.toString() + ']'

      this.onAppStartFindings.push(
        Finding.fromObject({
          name: `Agent launched`,
          description: `Version: ${Version.desc}`,
          alertId: 'LIDO-AGENT-LAUNCHED',
          severity: FindingSeverity.Info,
          type: FindingType.Info,
          metadata,
        }),
      )

      this.logger.info(
        `[${this.StethOperationSrv.getName()}] Last Depositor TxTime: ${new Date(
          this.StethOperationSrv.getStorage().getLastDepositorTxTime() * 1000,
        ).toUTCString()}`,
      )
      this.logger.info(
        `[${this.StethOperationSrv.getName()}] Buffered Eth: ${this.StethOperationSrv.getStorage()
          .getLastBufferedEth()
          .div(ETH_DECIMALS)
          .toFixed(2)} on ${latestBlockNumber.right} block`,
      )
      this.logger.info(elapsedTime('Agent.initialize', startTime) + '\n')

      const resp = new InitializeResponse()
      resp.setStatus(ResponseStatus.SUCCESS)

      callback(null, resp)
    }
  }
}
