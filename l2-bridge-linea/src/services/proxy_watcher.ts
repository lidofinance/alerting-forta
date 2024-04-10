import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { IShortABIcaller } from '../clients/proxy_contract_client'
import * as E from 'fp-ts/Either'
import { retry } from 'ts-retry'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import { getUniqueKey, networkAlert } from '../utils/finding.helpers'

export type ProxyWatcherInitResp = {
  lastImpls: string
  lastAdmins: string
}

export class ProxyWatcher {
  private readonly name: string = 'ProxyWatcher'

  private lastImpls = new Map<string, string>()
  private lastAdmins = new Map<string, string>()

  private readonly contractCallers: IShortABIcaller[]
  private readonly logger: Logger

  constructor(contractCallers: IShortABIcaller[], logger: Logger) {
    this.contractCallers = contractCallers
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  async initialize(currentBlock: number): Promise<E.Either<Error, ProxyWatcherInitResp>> {
    for (const contract of this.contractCallers) {
      const [lastImpl, lastAdmin] = await retry(
        async () => {
          return await Promise.all([
            contract.getProxyImplementation(currentBlock),
            contract.getProxyAdmin(currentBlock),
          ])
        },
        { delay: 1000, maxTry: 5 },
      )

      if (E.isLeft(lastImpl)) {
        return lastImpl
      }

      if (E.isLeft(lastAdmin)) {
        return lastAdmin
      }

      this.lastImpls.set(contract.getAddress(), lastImpl.right)
      this.lastAdmins.set(contract.getAddress(), lastAdmin.right)
    }

    this.logger.info(`${ProxyWatcher.name} started on block ${currentBlock}`)
    return E.right({
      lastImpls: JSON.stringify(Object.fromEntries(this.lastImpls)),
      lastAdmins: JSON.stringify(Object.fromEntries(this.lastAdmins)),
    })
  }

  public async handleBlocks(l2blockNumbers: number[]): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const BLOCK_INTERVAL = 10
    for (const l2blockNumber of l2blockNumbers) {
      if (l2blockNumber % BLOCK_INTERVAL === 0) {
        const [implFindings, adminFindings] = await Promise.all([
          this.handleProxyImplementationChanges(l2blockNumber),
          this.handleProxyAdminChanges(l2blockNumber),
        ])

        findings.push(...implFindings, ...adminFindings)
      }
    }

    this.logger.info(elapsedTime(ProxyWatcher.name + '.' + this.handleBlocks.name, start))
    return findings
  }

  private async handleProxyImplementationChanges(l2blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    for (const contract of this.contractCallers) {
      const lastImpl = this.lastImpls.get(contract.getAddress()) || ''

      const newImpl = await contract.getProxyImplementation(l2blockNumber)
      if (E.isLeft(newImpl)) {
        return [
          networkAlert(
            newImpl.left,
            `Error in ${ProxyWatcher.name}.${this.handleProxyAdminChanges.name}:90`,
            newImpl.left.message,
            l2blockNumber,
          ),
        ]
      }

      if (newImpl.right != lastImpl) {
        const uniqueKey = 'cc0a5077-7813-49d7-9e0d-7d3db6dd66a7'
        out.push(
          Finding.fromObject({
            name: '🚨 Linea: Proxy implementation changed',
            description:
              `Proxy implementation for ${contract.getName()}(${contract.getAddress()}) ` +
              `was changed form ${lastImpl} to ${newImpl}` +
              `\n(detected by func call)`,
            alertId: 'PROXY-UPGRADED',
            severity: FindingSeverity.High,
            type: FindingType.Info,
            metadata: { newImpl: newImpl.right, lastImpl: lastImpl },
            uniqueKey: getUniqueKey(uniqueKey + '-' + contract.getAddress(), l2blockNumber),
          }),
        )
      }

      this.lastImpls.set(contract.getAddress(), newImpl.right)
    }

    return out
  }

  private async handleProxyAdminChanges(l2blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    for (const contract of this.contractCallers) {
      const lastAdmin: string = this.lastAdmins.get(contract.getAddress()) || ''

      const newAdmin = await contract.getProxyAdmin(l2blockNumber)
      if (E.isLeft(newAdmin)) {
        return [
          networkAlert(
            newAdmin.left,
            `Error in ${ProxyWatcher.name}.${this.handleProxyAdminChanges.name}:125`,
            newAdmin.left.message,
            l2blockNumber,
          ),
        ]
      }

      if (newAdmin.right != lastAdmin) {
        const uniqueKey = `2ca8fe5a-63d1-4f7e-bb15-895bb2114241`
        out.push(
          Finding.fromObject({
            name: '🚨 Linea: Proxy admin changed',
            description:
              `Proxy admin for ${contract.getName()}(${contract.getAddress()}) ` +
              `was changed from ${lastAdmin} to ${newAdmin}` +
              `\n(detected by func call)`,
            alertId: 'PROXY-ADMIN-CHANGED',
            severity: FindingSeverity.High,
            type: FindingType.Info,
            metadata: { newAdmin: newAdmin.right, lastAdmin: lastAdmin },
            uniqueKey: getUniqueKey(uniqueKey + '-' + contract.getAddress(), l2blockNumber),
          }),
        )
      }

      this.lastAdmins.set(contract.getAddress(), newAdmin.right)
    }

    return out
  }
}
