import { IProxyContractClient } from '../clients/proxy_contract_client'
import * as E from 'fp-ts/Either'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import { networkAlert } from '../utils/errors'
import { Finding } from '../generated/proto/alert_pb'
import { BlockDto } from '../entity/blockDto'

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

  async handleL2Block(l2Block: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()

    const BLOCK_INTERVAL = 25
    const out: Finding[] = []

    if (l2Block.number % BLOCK_INTERVAL === 0) {
      const [impl, admin] = await Promise.all([
        this.handleProxyImplementationChanges(l2Block.number),
        this.handleProxyAdminChanges(l2Block.number),
      ])

      out.push(...impl, ...admin)
    }

    this.logger.info(this.getName() + '.impl = ' + this.getImpl())
    this.logger.info(this.getName() + '.adm = ' + this.getAdmin())
    this.logger.info(
      elapsedTime(this.proxyContract.getName() + `.` + this.handleL2Block.name + `(${l2Block.number})`, start),
    )
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
        ),
      ]
    }

    if (newImpl.right.toLowerCase() != this.getImpl().toLowerCase()) {
      const f: Finding = new Finding()

      f.setName('🚨 Arbitrum: Proxy implementation changed')
      f.setDescription(
        `Proxy implementation for ${this.proxyContract.getName()}(${this.proxyContract.getAddress()}) ` +
          `was changed form ${this.getImpl()} to ${newImpl}` +
          `\n(detected by func call)`,
      )
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')
      f.setUniquekey(l2BlockNumber.toString())

      const m = f.getMetadataMap()
      m.set('newImpl', newImpl.right)
      m.set('lastImpl', this.getImpl())

      out.push(f)

      this.setImpl(newImpl.right.toLowerCase())
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
        ),
      ]
    }

    if (newAdmin.right.toLowerCase() != this.getAdmin().toLowerCase()) {
      const f: Finding = new Finding()
      f.setName('🚨 arbitrum: Proxy admin changed')
      f.setDescription(
        `Proxy admin for ${this.proxyContract.getName()}(${this.proxyContract.getAddress()}) ` +
          `was changed from ${this.getAdmin()} to ${newAdmin}` +
          `\n(detected by func call)`,
      )
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')
      f.setUniquekey(l2blockNumber.toString())

      const m = f.getMetadataMap()
      m.set('newAdmin', newAdmin.right)
      m.set('lastAdmin', this.getAdmin())

      this.setAdmin(newAdmin.right.toLowerCase())

      out.push(f)
    }

    return out
  }
}
