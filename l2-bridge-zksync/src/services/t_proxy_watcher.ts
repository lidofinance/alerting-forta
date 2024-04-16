import { ITransparentProxyContractClient } from '../clients/transparent_proxy_contract_client'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { elapsedTime } from '../utils/time'
import { getUniqueKey, networkAlert } from '../utils/finding.helpers'

export class TProxyWatcher {
  private readonly name: string = 'TProxyWatcher'

  private lastImpl: string = ''
  private lastAdmin: string = ''
  private lastOwner: string = ''

  private readonly proxyContract: ITransparentProxyContractClient
  private readonly logger: Logger

  constructor(proxyContract: ITransparentProxyContractClient, logger: Logger) {
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

  public getOwner(): string {
    return this.lastOwner.toLowerCase()
  }

  public setAdmin(admin: string) {
    this.lastAdmin = admin
  }

  public setImpl(impl: string) {
    this.lastImpl = impl
  }

  public setOwner(owner: string) {
    this.lastOwner = owner
  }

  async initialize(latestL2BlockNumber: number): Promise<Error | null> {
    const [lastImpl, lastAdmin, lastOwner] = await Promise.all([
      this.proxyContract.getProxyImplementation(latestL2BlockNumber),
      this.proxyContract.getProxyAdmin(latestL2BlockNumber),
      this.proxyContract.getOwner(latestL2BlockNumber),
    ])

    if (E.isLeft(lastImpl)) {
      return lastImpl.left
    }

    if (E.isLeft(lastAdmin)) {
      return lastAdmin.left
    }

    if (E.isLeft(lastOwner)) {
      return lastOwner.left
    }

    this.setImpl(lastImpl.right.toLowerCase())
    this.setAdmin(lastAdmin.right.toLowerCase())
    this.setOwner(lastOwner.right.toLowerCase())

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
          this.handleOwnerChanges(l2BlockNumber),
        ])

        out.push(...impl, ...admin, ...owner)
      }
    }

    this.logger.info(this.getName() + '.impl = ' + this.getImpl())
    this.logger.info(this.getName() + '.adm = ' + this.getAdmin())
    this.logger.info(this.getName() + '.own = ' + this.getOwner())

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
      const uniqueKey = '8af33ac8-1cad-40a6-95f0-d13ca7e60876'

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

  private async handleProxyAdminChanges(blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newAdmin = await this.proxyContract.getProxyAdmin(blockNumber)
    if (E.isLeft(newAdmin)) {
      return [
        networkAlert(
          newAdmin.left,
          `Error in ${this.getName()}.${this.handleProxyAdminChanges.name}:142`,
          `Could not fetch getProxyAdmin on ${blockNumber}`,
          blockNumber,
        ),
      ]
    }

    if (newAdmin.right.toLowerCase() != this.getAdmin()) {
      const uniqueKey = 'ac58edab-9512-4606-942d-013d85d655f4'
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
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getProxyAdminAddress(), blockNumber),
        }),
      )

      this.setAdmin(newAdmin.right.toLowerCase())
    }
    return out
  }

  private async handleOwnerChanges(blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newOwner = await this.proxyContract.getOwner(blockNumber)
    if (E.isLeft(newOwner)) {
      return [
        networkAlert(
          newOwner.left,
          `Error in ${this.getName()}.${this.handleOwnerChanges.name}:179`,
          `Could not fetch getOwner on ${blockNumber}`,
          blockNumber,
        ),
      ]
    }

    if (newOwner.right.toLowerCase() != this.getOwner()) {
      const uniqueKey = '0ff2cac9-6b8a-486c-a8fe-fb2df81c8048'
      out.push(
        Finding.fromObject({
          name: '🚨 ZkSync: Proxy owner changed',
          description:
            `Proxy owner for ${this.proxyContract.getName()}(${this.proxyContract.getProxyAdminAddress()}) ` +
            `was changed from ${this.getOwner()} to ${newOwner.right}` +
            `\n(detected by func call)`,
          alertId: 'PROXY-OWNER-CHANGED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: { newOwner: newOwner.right.toLowerCase(), lastAdmin: this.getOwner() },
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getProxyAdminAddress(), blockNumber),
        }),
      )

      this.setOwner(newOwner.right.toLowerCase())
    }
    return out
  }
}
