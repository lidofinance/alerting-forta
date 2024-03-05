import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { IProxyContractClient } from '../clients/proxy_contract_client'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import { getUniqueKey, networkAlert } from '../utils/finding.helpers'

export class ProxyWatcher {
  private readonly name: string = 'ProxyWatcher'

  private lastImpl: string = ''
  private lastAdmin: string = ''

  private readonly proxyContract: IProxyContractClient
  private readonly logger: Logger

  constructor(proxyContract: IProxyContractClient, logger: Logger) {
    this.proxyContract = proxyContract
    this.logger = logger
  }

  public getName(): string {
    return this.proxyContract.getName() + '.' + this.name
  }

  public getAdmin(): string {
    return this.lastAdmin
  }

  public getImpl(): string {
    return this.lastImpl
  }

  public setAdmin(admin: string) {
    this.lastAdmin = admin
  }

  public setImpl(impl: string) {
    this.lastImpl = impl
  }

  async initialize(currentBlock: number): Promise<Error | null> {
    const [lastImpl, lastAdmin] = await Promise.all([
      this.proxyContract.getProxyImplementation(currentBlock),
      this.proxyContract.getProxyAdmin(currentBlock),
    ])

    if (E.isLeft(lastImpl)) {
      return lastImpl.left
    }

    if (E.isLeft(lastAdmin)) {
      return lastAdmin.left
    }

    this.setImpl(lastImpl.right)
    this.setAdmin(lastAdmin.right)

    this.logger.info(`${this.getName()}. started on block ${currentBlock}`)

    return null
  }

  async handleBlocks(blockNumbers: number[]): Promise<Finding[]> {
    const start = new Date().getTime()

    const BLOCK_INTERVAL = 25
    const out: Finding[] = []

    for (const blockNumber of blockNumbers) {
      if (blockNumber % BLOCK_INTERVAL === 0) {
        const [impl, admin] = await Promise.all([
          this.handleProxyImplementationChanges(blockNumber),
          this.handleProxyAdminChanges(blockNumber),
        ])

        out.push(...impl, ...admin)
      }
    }

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleBlocks.name, start))
    return out
  }

  private async handleProxyImplementationChanges(blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newImpl = await this.proxyContract.getProxyImplementation(blockNumber)
    if (E.isLeft(newImpl)) {
      return [
        networkAlert(
          newImpl.left,
          `Error in ${this.getName()}.${this.handleProxyImplementationChanges.name}:88`,
          `Could not fetch proxyImplementation on ${blockNumber}`,
          blockNumber,
        ),
      ]
    }

    if (newImpl.right != this.getImpl()) {
      const uniqueKey = '4739d08c-7f77-4cce-9a21-6bdef5160cba'

      out.push(
        Finding.fromObject({
          name: '🚨 Base: Proxy implementation changed',
          description:
            `Proxy implementation for ${this.proxyContract.getName()}(${this.proxyContract.getName()}) ` +
            `was changed form ${this.getImpl()} to ${newImpl.right}` +
            `\n(detected by func call)`,
          alertId: 'PROXY-UPGRADED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: { newImpl: newImpl.right, lastImpl: this.getImpl() },
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getAddress(), blockNumber),
        }),
      )
      this.setImpl(newImpl.right)
    }

    return out
  }

  private async handleProxyAdminChanges(blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newAdmin = await this.proxyContract.getProxyAdmin(blockNumber)
    if (E.isLeft(newAdmin)) {
      return [
        networkAlert(
          newAdmin.left,
          `Error in ${this.getName()}.${this.handleProxyAdminChanges.name}:126`,
          `Could not fetch getProxyAdmin on ${blockNumber}`,
          blockNumber,
        ),
      ]
    }

    if (newAdmin.right != this.getAdmin()) {
      const uniqueKey = '89a0f5f4-66d8-4ff2-9633-fdae0568df94'
      out.push(
        Finding.fromObject({
          name: '🚨 Base: Proxy admin changed',
          description:
            `Proxy admin for ${this.proxyContract.getName()}(${this.proxyContract.getAddress()}) ` +
            `was changed from ${this.getAdmin()} to ${newAdmin.right}` +
            `\n(detected by func call)`,
          alertId: 'PROXY-ADMIN-CHANGED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: { newAdmin: newAdmin.right, lastAdmin: this.getAdmin() },
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getAddress(), blockNumber),
        }),
      )

      this.setAdmin(newAdmin.right)
    }
    return out
  }
}
