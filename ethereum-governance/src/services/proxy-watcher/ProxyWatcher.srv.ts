import * as E from 'fp-ts/Either'
import { LIDO_PROXY_CONTRACTS_DATA } from 'constants/proxy-watcher'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { elapsedTime } from '../../shared/time'
import { Logger } from 'winston'
import { networkAlert } from '../../shared/errors'
import type { IProxyWatcherClient } from './contract'
import { etherscanAddress } from '../../shared/string'
import { ProxyInfo } from '../../shared/types'

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
  public async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()

    for (const address of LIDO_PROXY_CONTRACTS_DATA.keys()) {
      const proxyInfo = LIDO_PROXY_CONTRACTS_DATA.get(address) as ProxyInfo
      const isDeployed = await this.ethProvider.isDeployed(address, currentBlock)

      if (!E.isLeft(isDeployed) && !isDeployed.right) {
        this.proxiesNoCode.push(address)

        this.initFindings.push(
          Finding.fromObject({
            name: '🚨 Proxy contract not found',
            description: `Proxy contract ${proxyInfo.name} (${etherscanAddress(address)}) not found`,
            alertId: 'PROXY-NOT-FOUND',
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
          }),
        )

        continue
      }

      const proxyImplementation = await this.ethProvider.getProxyImplementation(address, proxyInfo, currentBlock)

      if (E.isLeft(proxyImplementation)) {
        return Error(
          `Error in ${ProxyWatcherSrv.name}.${this.initialize.name}. Could not call ethProvider.getCode for address - ${address}`,
        )
      } else {
        this.prevProxyImplementations.set(address, proxyImplementation.right)
      }
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    if (this.initFindings.length > 0) {
      findings.push(...this.initFindings)
      this.initFindings = []
    }

    const proxyFindings = await this.handleProxyChanges(blockEvent)
    findings.push(...proxyFindings)

    this.logger.info(elapsedTime(ProxyWatcherSrv.name + '.' + this.handleBlock.name, start))
    return findings
  }

  public async handleProxyChanges(blockEvent: BlockEvent) {
    const blockNumber = blockEvent.blockNumber
    const findings: Finding[] = []

    for (const address of LIDO_PROXY_CONTRACTS_DATA.keys()) {
      if (this.proxiesNoCode.includes(address)) {
        continue
      }

      const proxyInfo = LIDO_PROXY_CONTRACTS_DATA.get(address) as ProxyInfo
      const isDeployed = await this.ethProvider.isDeployed(address, blockNumber)

      if (!E.isLeft(isDeployed) && !isDeployed.right) {
        this.proxiesNoCode.push(address)

        findings.push(
          Finding.fromObject({
            name: `🚨 Proxy contract selfdestructed`,
            description: `Proxy contract ${proxyInfo.name} (${etherscanAddress(address)}) selfdestructed`,
            alertId: `PROXY-SELFDESTRUCTED`,
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
          }),
        )

        continue
      }

      const proxyImplementation = await this.ethProvider.getProxyImplementation(address, proxyInfo, blockNumber)

      if (E.isLeft(proxyImplementation)) {
        findings.push(
          networkAlert(
            proxyImplementation.left,
            `Error in ${ProxyWatcherSrv.name}.${this.handleProxyChanges.name} (uid:bdbd1548)`,
            `Could not call ethProvider.getCode for address - ${address}`,
          ),
        )
      } else {
        const prevImpl = this.prevProxyImplementations.get(address)

        if (!prevImpl) {
          findings.push(
            Finding.fromObject({
              name: `🚨 Proxy implementation not found`,
              description: `Proxy implementation of ${proxyInfo.name} contract was not found`,
              alertId: `PROXY-IMPL-NOT-FOUND`,
              severity: FindingSeverity.High,
              type: FindingType.Info,
            }),
          )
        } else if (prevImpl.toLowerCase() != proxyImplementation.right.toLowerCase()) {
          findings.push(
            Finding.fromObject({
              name: `🚨 Proxy implementation changed`,
              description: `Implementation of ${proxyInfo.name} (${etherscanAddress(address)}) changed from ${
                prevImpl ? etherscanAddress(prevImpl) : prevImpl
              } to ${etherscanAddress(proxyImplementation.right)}`,
              alertId: `PROXY-IMPL-CHANGED`,
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
            }),
          )
        }
        this.prevProxyImplementations.set(address, proxyImplementation.right)
      }
    }

    return findings
  }
}
