import * as E from 'fp-ts/Either'
import { LIDO_PROXY_CONTRACTS_DATA } from 'constants/proxy-watcher'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { elapsedTime } from '../../utils/time'
import { Logger } from 'winston'
import { networkAlert } from '../../utils/errors'
import type { IProxyWatcherClient } from './contract'
import { etherscanAddress } from '../../utils/string'

export class ProxyWatcherSrv {
  private readonly logger: Logger
  private readonly name = 'ProxyWatcherSrv'
  private readonly ethProvider: IProxyWatcherClient

  private prevProxyImplementations: Map<string, string> = new Map<string, string>()
  private initFindings: Finding[] = []
  private proxiesNoCode: string[] = []

  constructor(logger: Logger, ethProvider: IProxyWatcherClient) {
    this.logger = logger
    this.ethProvider = ethProvider
  }
  public async initialize(currentBlock: number): Promise<null> {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    await Promise.all(
      Array.from(LIDO_PROXY_CONTRACTS_DATA.keys()).map(async (address: string) => {
        const data = LIDO_PROXY_CONTRACTS_DATA.get(address)
        const isDeployed = await this.ethProvider.isDeployed(address, currentBlock)
        if (!E.isLeft(isDeployed) && !isDeployed.right) {
          this.proxiesNoCode.push(address)
          this.initFindings.push(
            Finding.fromObject({
              name: '🚨 Proxy contract not found',
              description: `Proxy contract ${data?.name} (${etherscanAddress(address)}) not found`,
              alertId: 'PROXY-NOT-FOUND',
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
            }),
          )
          return
        }

        if (!data) {
          return
        }

        const proxyImplementation = await this.ethProvider.getProxyImplementation(address, data, currentBlock)
        if (E.isLeft(proxyImplementation)) {
          this.initFindings.push(
            networkAlert(
              proxyImplementation.left,
              `Error in ${ProxyWatcherSrv.name}.${this.initialize.name} (uid:bdbd1548)`,
              `Could not call ethProvider.getCode for address - ${address}`,
            ),
          )
          return
        }
        this.prevProxyImplementations.set(address, String(proxyImplementation.right?.[0]))
      }),
    )

    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = [...this.initFindings]

    const [proxyImplementationsFindings] = await Promise.all([this.handleProxyImplementations(blockEvent)])

    findings.push(...proxyImplementationsFindings)

    this.logger.info(elapsedTime(ProxyWatcherSrv.name + '.' + this.handleBlock.name, start))

    if (this.initFindings.length > 0) {
      this.initFindings = []
    }

    return findings
  }

  public async handleProxyImplementations(blockEvent: BlockEvent) {
    const out: Finding[] = []
    await Promise.all(
      Array.from(LIDO_PROXY_CONTRACTS_DATA.keys()).map(async (address: string) => {
        if (this.proxiesNoCode.includes(address)) {
          return
        }

        const data = LIDO_PROXY_CONTRACTS_DATA.get(address)
        const isDeployed = await this.ethProvider.isDeployed(address, blockEvent.blockNumber)

        if (!E.isLeft(isDeployed) && !isDeployed.right) {
          this.proxiesNoCode.push(address)
          out.push(
            Finding.fromObject({
              name: `🚨 Proxy contract selfdestructed`,
              description: `Proxy contract ${data?.name} (${etherscanAddress(address)}) selfdestructed`,
              alertId: `PROXY-SELFDESTRUCTED`,
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
            }),
          )
          return
        }

        if (!data) {
          return
        }

        const proxyImplementation = await this.ethProvider.getProxyImplementation(address, data, blockEvent.blockNumber)

        if (E.isLeft(proxyImplementation)) {
          out.push(
            networkAlert(
              proxyImplementation.left,
              `Error in ${ProxyWatcherSrv.name}.${this.handleProxyImplementations.name} (uid:bdbd1548)`,
              `Could not call ethProvider.getCode for address - ${address}`,
            ),
          )
          return
        }

        const prevImpl = this.prevProxyImplementations.get(address)
        if (prevImpl != proxyImplementation.right?.[0]) {
          out.push(
            Finding.fromObject({
              name: `🚨 Proxy implementation changed`,
              description: `Implementation of ${data.name} (${etherscanAddress(address)}) changed from ${
                prevImpl ? etherscanAddress(prevImpl) : prevImpl
              } to ${etherscanAddress(proxyImplementation.right?.[0])}`,
              alertId: `PROXY-IMPL-CHANGED`,
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
            }),
          )
        }
        this.prevProxyImplementations.set(address, proxyImplementation.right?.[0])
      }),
    )

    return out
  }
}
