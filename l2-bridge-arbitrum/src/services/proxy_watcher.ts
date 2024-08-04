import { IProxyContractClient } from '../clients/proxy_contract_client'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { networkAlert } from '../utils/errors'
import { Finding } from '../generated/proto/alert_pb'
import { BlockDto } from '../entity/l2block'

export class ProxyWatcher {
  private lastImpl: string = ''
  private lastAdmin: string = ''

  private readonly proxyContract: IProxyContractClient
  private readonly logger: Logger
  private readonly networkName: string

  constructor(proxyContract: IProxyContractClient, logger: Logger, networkName: string) {
    this.proxyContract = proxyContract
    this.logger = logger
    this.networkName = networkName
  }

  public getName(): string {
    return this.proxyContract.getName() + `(${this.proxyContract.getAddress()})`
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

  async initialize(currentBlockNumber: number): Promise<Error[]> {
    const [lastImpl, lastAdmin] = await Promise.all([
      this.proxyContract.getProxyImplementation(currentBlockNumber),
      this.proxyContract.getProxyAdmin(currentBlockNumber),
    ])

    if (E.isLeft(lastImpl)) {
      return [lastImpl.left]
    }

    if (E.isLeft(lastAdmin)) {
      return [lastAdmin.left]
    }

    this.setImpl(lastImpl.right)
    this.setAdmin(lastAdmin.right)

    this.logger.info(`${this.getName()}. started on block ${currentBlockNumber}`)

    return []
  }

  public async handleBlocks(blocks: BlockDto[]): Promise<Finding[]> {
    if (blocks.length === 0) {
      return []
    }

    const promises = []
    promises.push(
      this.handleProxyImplementationChanges(blocks[blocks.length - 1].number),
      this.handleProxyAdminChanges(blocks[blocks.length - 1].number),
    )

    const findings = (await Promise.all(promises)).flat()
    this.logger.info(`\t\t` + this.getName() + '.impl = ' + this.getImpl())
    this.logger.info(`\t\t` + this.getName() + '.adm = ' + this.getAdmin())

    return findings
  }

  private async handleProxyImplementationChanges(blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    const newImpl = await this.proxyContract.getProxyImplementation(blockNumber)
    if (E.isLeft(newImpl)) {
      return [
        networkAlert(
          newImpl.left,
          `Error in ${this.getName()}.${this.handleProxyImplementationChanges.name}:98`,
          `Could not fetch proxyImplementation on ${blockNumber}`,
        ),
      ]
    }

    if (newImpl.right.toLowerCase() != this.getImpl().toLowerCase()) {
      const f: Finding = new Finding()

      f.setName(`🚨 ${this.networkName}: Proxy implementation changed`)
      f.setDescription(
        `Proxy implementation for ${this.proxyContract.getName()}(${this.proxyContract.getAddress()}) ` +
          `was changed form ${this.getImpl()} to ${newImpl.right.toLowerCase()}` +
          `\n(detected by func call)`,
      )
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      const m = f.getMetadataMap()
      m.set('newImpl', newImpl.right.toLowerCase())
      m.set('lastImpl', this.getImpl())

      out.push(f)

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
          `Error in ${this.getName()}.${this.handleProxyAdminChanges.name}:138`,
          `Could not fetch getProxyAdmin on ${blockNumber}`,
        ),
      ]
    }

    if (newAdmin.right.toLowerCase() != this.getAdmin().toLowerCase()) {
      const f: Finding = new Finding()
      f.setName(`🚨 ${this.networkName}: Proxy admin changed`)
      f.setDescription(
        `Proxy admin for ${this.proxyContract.getName()}(${this.proxyContract.getAddress()}) ` +
          `was changed from ${this.getAdmin()} to ${newAdmin.right.toLowerCase()}` +
          `\n(detected by func call)`,
      )
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')
      f.setUniquekey(blockNumber.toString())

      const m = f.getMetadataMap()
      m.set('newAdmin', newAdmin.right.toLowerCase())
      m.set('lastAdmin', this.getAdmin())

      this.setAdmin(newAdmin.right.toLowerCase())

      out.push(f)
    }

    return out
  }
}
