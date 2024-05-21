import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { IProxyContractClient } from '../clients/proxy_contract_client'
import * as E from 'fp-ts/Either'
import { getUniqueKey, networkAlert } from '../utils/finding.helpers'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'

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
    return this.proxyContract.getName() + `(${this.proxyContract.getAddress()}).` + this.name
  }

  public getAdmin(): string {
    return this.lastAdmin.toLowerCase()
  }

  public getImpl(): string {
    return this.lastImpl.toLowerCase()
  }

  public setAdmin(admin: string) {
    this.lastAdmin = admin.toLowerCase()
  }

  public setImpl(impl: string) {
    this.lastImpl = impl.toLowerCase()
  }

  async initialize(currentL2Block: number): Promise<Error | null> {
    const [lastImpl, lastAdmin] = await Promise.all([
      this.proxyContract.getProxyImplementation(currentL2Block),
      this.proxyContract.getProxyAdmin(currentL2Block),
    ])

    if (E.isLeft(lastImpl)) {
      return lastImpl.left
    }

    if (E.isLeft(lastAdmin)) {
      return lastAdmin.left
    }

    this.setImpl(lastImpl.right)
    this.setAdmin(lastAdmin.right)

    this.logger.info(`${this.getName()}. started on block ${currentL2Block}`)

    return null
  }

  async handleL2Blocks(l2blockNumbers: number[]): Promise<Finding[]> {
    const start = new Date().getTime()

    const BLOCK_INTERVAL = 25
    const out: Finding[] = []

    for (const l2blockNumber of l2blockNumbers) {
      if (l2blockNumber % BLOCK_INTERVAL === 0) {
        const [impl, admin] = await Promise.all([
          this.handleProxyImplementationChanges(l2blockNumber),
          this.handleProxyAdminChanges(l2blockNumber),
        ])

        out.push(...impl, ...admin)
      }
    }

    this.logger.info(this.getName() + '.impl = ' + this.getImpl())
    this.logger.info(this.getName() + '.adm = ' + this.getAdmin())
    this.logger.info(elapsedTime(this.proxyContract.getName() + `.` + this.handleL2Blocks.name, start))
    return out
  }

  private async handleProxyImplementationChanges(l2BlockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newImpl = await this.proxyContract.getProxyImplementation(l2BlockNumber)
    if (E.isLeft(newImpl)) {
      return [
        networkAlert(
          newImpl.left,
          `Error in ${this.getName()}.${this.handleProxyImplementationChanges.name}:98`,
          `Could not fetch proxyImplementation on ${l2BlockNumber}`,
          l2BlockNumber,
        ),
      ]
    }

    if (newImpl.right.toLowerCase() != this.getImpl()) {
      const uniqueKey = '3d1b3e5b-5eb1-4926-896a-230d5f51070c'

      out.push(
        Finding.fromObject({
          name: '🚨 Mantle: Proxy implementation changed',
          description:
            `Proxy implementation for ${this.proxyContract.getName()}(${this.proxyContract.getAddress()}) ` +
            `was changed form ${this.getImpl()} to ${newImpl}` +
            `\n(detected by func call)`,
          alertId: 'PROXY-UPGRADED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: { newImpl: newImpl.right, lastImpl: this.getImpl() },
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getAddress(), l2BlockNumber),
        }),
      )

      this.setImpl(newImpl.right)
    }

    return out
  }

  private async handleProxyAdminChanges(l2blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newAdmin = await this.proxyContract.getProxyAdmin(l2blockNumber)
    if (E.isLeft(newAdmin)) {
      return [
        networkAlert(
          newAdmin.left,
          `Error in ${this.getName()}.${this.handleProxyAdminChanges.name}:138`,
          `Could not fetch getProxyAdmin on ${l2blockNumber}`,
          l2blockNumber,
        ),
      ]
    }

    if (newAdmin.right.toLowerCase() != this.getAdmin()) {
      const uniqueKey = 'a5c757e0-22b2-4a9b-83cd-cdf6f2915ddc'
      out.push(
        Finding.fromObject({
          name: '🚨 Mantle: Proxy admin changed',
          description:
            `Proxy admin for ${this.proxyContract.getName()}(${this.proxyContract.getAddress()}) ` +
            `was changed from ${this.getAdmin()} to ${newAdmin}` +
            `\n(detected by func call)`,
          alertId: 'PROXY-ADMIN-CHANGED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: { newAdmin: newAdmin.right, lastAdmin: this.getAdmin() },
          uniqueKey: getUniqueKey(uniqueKey + '-' + this.proxyContract.getAddress(), l2blockNumber),
        }),
      )

      this.setAdmin(newAdmin.right)
    }
    return out
  }
}
