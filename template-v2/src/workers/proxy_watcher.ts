import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { IShortABIcaller } from '../entity/proxy_contract'
import * as E from 'fp-ts/Either'
import { errorToFinding } from '../utils/error'

export type ProxyWatcherInitResp = {
  lastImpls: string
  lastAdmins: string
}

export class ProxyWatcher {
  private readonly name: string = 'ProxyWatcher'

  private lastImpls = new Map<string, string>()
  private lastAdmins = new Map<string, string>()

  private readonly contractCallers: IShortABIcaller[]

  constructor(contractCallers: IShortABIcaller[]) {
    this.contractCallers = contractCallers
  }

  public getName(): string {
    return this.name
  }

  async initialize(
    currentBlock: number,
  ): Promise<E.Either<Error, ProxyWatcherInitResp>> {
    console.log(`[${this.name}]`)

    for (const contract of this.contractCallers) {
      const [lastImpl, lastAdmin] = await Promise.all([
        contract.getProxyImplementation(currentBlock),
        contract.getProxyAdmin(currentBlock),
      ])

      if (E.isLeft(lastImpl)) {
        return lastImpl
      }

      if (E.isLeft(lastAdmin)) {
        return lastAdmin
      }

      this.lastImpls.set(contract.getAddress(), lastImpl.right)
      this.lastAdmins.set(contract.getAddress(), lastAdmin.right)
    }

    return E.right({
      lastImpls: JSON.stringify(Object.fromEntries(this.lastImpls)),
      lastAdmins: JSON.stringify(Object.fromEntries(this.lastAdmins)),
    })
  }

  async handleBlocks(blockNumbers: number[]): Promise<Finding[]> {
    const findings: Finding[] = []

    const BLOCK_INTERVAL = 10
    for (const blockNumber of blockNumbers) {
      if (blockNumber % BLOCK_INTERVAL === 0) {
        const [implFindings, adminFindings] = await Promise.all([
          this.handleProxyImplementationChanges(blockNumber),
          this.handleProxyAdminChanges(blockNumber),
        ])

        findings.push(...implFindings, ...adminFindings)
      }
    }

    return findings
  }

  private async handleProxyImplementationChanges(
    blockNumber: number,
  ): Promise<Finding[]> {
    const out: Finding[] = []

    for (const contract of this.contractCallers) {
      const lastImpl = this.lastImpls.get(contract.getAddress()) || ''

      const newImpl = await contract.getProxyImplementation(blockNumber)
      if (E.isLeft(newImpl)) {
        return [
          errorToFinding(
            newImpl.left,
            ProxyWatcher.name,
            this.handleProxyImplementationChanges.name,
          ),
        ]
      }

      if (newImpl.right != lastImpl) {
        out.push(
          Finding.fromObject({
            name: '🚨 Base: Proxy implementation changed',
            description:
              `Proxy implementation for ${contract.getName()}(${contract.getAddress()}) ` +
              `was changed form ${lastImpl} to ${newImpl}` +
              `\n(detected by func call)`,
            alertId: 'PROXY-UPGRADED',
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
            metadata: { newImpl: newImpl.right, lastImpl: lastImpl },
          }),
        )
      }

      this.lastImpls.set(contract.getAddress(), newImpl.right)
    }

    return out
  }

  private async handleProxyAdminChanges(
    blockNumber: number,
  ): Promise<Finding[]> {
    const out: Finding[] = []

    for (const contract of this.contractCallers) {
      const lastAdmin: string = this.lastAdmins.get(contract.getAddress()) || ''

      const newAdmin = await contract.getProxyAdmin(blockNumber)
      if (E.isLeft(newAdmin)) {
        return [
          errorToFinding(
            newAdmin.left,
            ProxyWatcher.name,
            this.handleProxyAdminChanges.name,
          ),
        ]
      }

      if (newAdmin.right != lastAdmin) {
        out.push(
          Finding.fromObject({
            name: '🚨 Base: Proxy admin changed',
            description:
              `Proxy admin for ${contract.getName()}(${contract.getAddress()}) ` +
              `was changed from ${lastAdmin} to ${newAdmin}` +
              `\n(detected by func call)`,
            alertId: 'PROXY-ADMIN-CHANGED',
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
            metadata: { newAdmin: newAdmin.right, lastAdmin: lastAdmin },
          }),
        )
      }

      this.lastAdmins.set(contract.getAddress(), newAdmin.right)
    }

    return out
  }
}
