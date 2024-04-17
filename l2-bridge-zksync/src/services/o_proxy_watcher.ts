import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { elapsedTime } from '../utils/time'
import { getUniqueKey, networkAlert } from '../utils/finding.helpers'
import { IOssifiableProxyContractClient } from '../clients/ossifiable_proxy_contract_client'

export class OProxyWatcher {
  private readonly name: string = 'OProxyWatcher'

  private lastImpl: string = ''
  private lastAdmin: string = ''
  private ossified: boolean = false

  private readonly proxyContract: IOssifiableProxyContractClient
  private readonly logger: Logger

  constructor(proxyContract: IOssifiableProxyContractClient, logger: Logger) {
    this.proxyContract = proxyContract
    this.logger = logger
  }

  public getName(): string {
    return this.proxyContract.getName() + `(${this.proxyContract.getProxyAdminAddress()}).` + this.name
  }

  public getAdmin(): string {
    return this.lastAdmin.toLowerCase()
  }

  public getImpl(): string {
    return this.lastImpl.toLowerCase()
  }

  public isOssified(): boolean {
    return this.ossified
  }

  public setAdmin(admin: string) {
    this.lastAdmin = admin
  }

  public setImpl(impl: string) {
    this.lastImpl = impl
  }

  public setOssified(isOssified: boolean) {
    this.ossified = isOssified
  }

  async initialize(latestL2BlockNumber: number): Promise<Error | null> {
    const [lastImpl, lastAdmin, isOssified] = await Promise.all([
      this.proxyContract.getProxyImplementation(latestL2BlockNumber),
      this.proxyContract.getProxyAdmin(latestL2BlockNumber),
      this.proxyContract.getOssified(latestL2BlockNumber),
    ])

    if (E.isLeft(lastImpl)) {
      return lastImpl.left
    }

    if (E.isLeft(lastAdmin)) {
      return lastAdmin.left
    }

    if (E.isLeft(isOssified)) {
      return isOssified.left
    }

    this.setImpl(lastImpl.right.toLowerCase())
    this.setAdmin(lastAdmin.right.toLowerCase())
    this.setOssified(isOssified.right)

    this.logger.info(`${this.getName()}. started on block ${latestL2BlockNumber}`)

    return null
  }

  async handleL2Blocks(l2BlockNumbers: number[]): Promise<Finding[]> {
    const start = new Date().getTime()

    const BLOCK_INTERVAL = 25
    const out: Finding[] = []

    for (const l2BlockNumber of l2BlockNumbers) {
      if (l2BlockNumber % BLOCK_INTERVAL === 0) {
        const [impl, admin, owner] = await Promise.all([
          this.handleProxyImplementationChanges(l2BlockNumber),
          this.handleProxyAdminChanges(l2BlockNumber),
          this.handleOssifiedChanges(l2BlockNumber),
        ])

        out.push(...impl, ...admin, ...owner)
      }
    }

    this.logger.info(this.getName() + '.impl = ' + this.getImpl())
    this.logger.info(this.getName() + '.admin = ' + this.getAdmin())
    this.logger.info(this.getName() + '.isOssified = ' + this.isOssified())

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleL2Blocks.name, start))
    return out
  }

  private async handleProxyImplementationChanges(l2BlockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newImpl = await this.proxyContract.getProxyImplementation(l2BlockNumber)
    if (E.isLeft(newImpl)) {
      return [
        networkAlert(
          newImpl.left,
          `Error in ${this.getName()}.${this.handleProxyImplementationChanges.name}:104`,
          `Could not fetch proxyImplementation on ${l2BlockNumber}`,
          l2BlockNumber,
        ),
      ]
    }

    if (newImpl.right.toLowerCase() != this.getImpl()) {
      const uniqueKey = 'a0cc5ee4-c514-42c4-9501-f936cdd55470'

      out.push(
        Finding.fromObject({
          name: '🚨 ZkSync: Proxy implementation changed',
          description:
            `Proxy implementation for ${this.proxyContract.getName()}(${this.proxyContract.getProxyAdminAddress()}) ` +
            `was changed form ${this.getImpl()} to ${newImpl.right}` +
            `\n(detected by func call)`,
          alertId: 'PROXY-UPGRADED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: { newImpl: newImpl.right.toLowerCase(), lastImpl: this.getImpl() },
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getProxyAdminAddress(), l2BlockNumber),
        }),
      )
      this.setImpl(newImpl.right.toLowerCase())
    }

    return out
  }

  private async handleProxyAdminChanges(l2BlockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newAdmin = await this.proxyContract.getProxyAdmin(l2BlockNumber)
    if (E.isLeft(newAdmin)) {
      return [
        networkAlert(
          newAdmin.left,
          `Error in ${this.getName()}.${this.handleProxyAdminChanges.name}:142`,
          `Could not fetch getProxyAdmin on ${l2BlockNumber}`,
          l2BlockNumber,
        ),
      ]
    }

    if (newAdmin.right.toLowerCase() != this.getAdmin()) {
      const uniqueKey = '0e48b31d-6a94-4fc0-867d-9bcecd38cfc8'
      out.push(
        Finding.fromObject({
          name: '🚨 ZkSync: Proxy admin changed',
          description:
            `Proxy admin for ${this.proxyContract.getName()}(${this.proxyContract.getProxyAdminAddress()}) ` +
            `was changed from ${this.getAdmin()} to ${newAdmin.right}` +
            `\n(detected by func call)`,
          alertId: 'PROXY-ADMIN-CHANGED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: { newAdmin: newAdmin.right.toLowerCase(), lastAdmin: this.getAdmin() },
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getProxyAdminAddress(), l2BlockNumber),
        }),
      )

      this.setAdmin(newAdmin.right.toLowerCase())
    }
    return out
  }

  private async handleOssifiedChanges(l2BlockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const isOssified = await this.proxyContract.getOssified(l2BlockNumber)
    if (E.isLeft(isOssified)) {
      return [
        networkAlert(
          isOssified.left,
          `Error in ${this.getName()}.${this.handleOssifiedChanges.name}:179`,
          `Could not fetch getOssified on ${l2BlockNumber}`,
          l2BlockNumber,
        ),
      ]
    }

    if (isOssified.right != this.isOssified()) {
      const uniqueKey = 'ea4de45d-1cfe-4db5-9d6b-49cd04611a02'
      out.push(
        Finding.fromObject({
          name: '🚨 ZkSync: Proxy ossified is changed',
          description:
            `Proxy ossified for ${this.proxyContract.getName()}(${this.proxyContract.getProxyAdminAddress()}) ` +
            `was changed from ${this.isOssified()} to ${isOssified.right}` +
            `\n(detected by func call)`,
          alertId: 'PROXY-OSSIFIED-CHANGED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: {
            newIsOssified: String(isOssified.right),
            lastIsOssified: String(this.isOssified()),
          },
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getProxyAdminAddress(), l2BlockNumber),
        }),
      )

      this.setOssified(isOssified.right)
    }
    return out
  }
}
