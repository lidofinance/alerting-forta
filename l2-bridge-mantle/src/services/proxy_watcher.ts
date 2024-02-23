import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { IProxyContractClient } from '../clients/proxy_contract_client'
import * as E from 'fp-ts/Either'
import { retry } from 'ts-retry'
import { DataRW } from '../utils/mutex'
import { getUniqueKey, networkAlert } from '../utils/finding.helpers'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'

export type ProxyWatcherInitResp = {
  lastImpls: string
  lastAdmins: string
}

export class ProxyWatcher {
  private readonly name: string = 'ProxyWatcher'

  private lastImpls = new Map<string, string>()
  private lastAdmins = new Map<string, string>()

  private readonly contractCallers: IProxyContractClient[]
  private readonly logger: Logger

  constructor(contractCallers: IProxyContractClient[], logger: Logger) {
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

  async handleBlocks(blockNumbers: number[]): Promise<Finding[]> {
    const start = new Date().getTime()

    const BLOCK_INTERVAL = 25
    const batchPromises: Promise<void>[] = []
    const out = new DataRW<Finding>([])

    for (const blockNumber of blockNumbers) {
      if (blockNumber % BLOCK_INTERVAL === 0) {
        const promiseProxyImpl = this.handleProxyImplementationChanges(blockNumber).then((findings: Finding[]) => {
          out.write(findings)
        })

        const promiseAdminChanges = this.handleProxyAdminChanges(blockNumber).then((findings: Finding[]) => {
          out.write(findings)
        })

        batchPromises.push(promiseProxyImpl, promiseAdminChanges)
      }
    }

    await Promise.all(batchPromises)
    this.logger.info(elapsedTime(ProxyWatcher.name + '.' + this.handleBlocks.name, start))

    return await out.read()
  }

  private async handleProxyImplementationChanges(blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    for (const contract of this.contractCallers) {
      const lastImpl = this.lastImpls.get(contract.getAddress()) || ''

      const newImpl = await contract.getProxyImplementation(blockNumber)
      if (E.isLeft(newImpl)) {
        return [
          networkAlert(
            newImpl.left,
            `Error in ${ProxyWatcher.name}.${this.handleProxyAdminChanges.name}:89`,
            newImpl.left.message,
            blockNumber,
          ),
        ]
      }

      if (newImpl.right != lastImpl) {
        const uniqueKey = '3d1b3e5b-5eb1-4926-896a-230d5f51070c'

        out.push(
          Finding.fromObject({
            name: '🚨 Mantle: Proxy implementation changed',
            description:
              `Proxy implementation for ${contract.getName()}(${contract.getAddress()}) ` +
              `was changed form ${lastImpl} to ${newImpl}` +
              `\n(detected by func call)`,
            alertId: 'PROXY-UPGRADED',
            severity: FindingSeverity.High,
            type: FindingType.Info,
            metadata: { newImpl: newImpl.right, lastImpl: lastImpl },
            uniqueKey: getUniqueKey(uniqueKey + '-' + contract.getAddress(), blockNumber),
          }),
        )
      }

      this.lastImpls.set(contract.getAddress(), newImpl.right)
    }

    return out
  }

  private async handleProxyAdminChanges(blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    for (const contract of this.contractCallers) {
      const lastAdmin: string = this.lastAdmins.get(contract.getAddress()) || ''

      const newAdmin = await contract.getProxyAdmin(blockNumber)
      if (E.isLeft(newAdmin)) {
        return [
          networkAlert(
            newAdmin.left,
            `Error in ${ProxyWatcher.name}.${this.handleProxyAdminChanges.name}:132`,
            newAdmin.left.message,
            blockNumber,
          ),
        ]
      }

      if (newAdmin.right != lastAdmin) {
        const uniqueKey = 'a5c757e0-22b2-4a9b-83cd-cdf6f2915ddc'
        out.push(
          Finding.fromObject({
            name: '🚨 Mantle: Proxy admin changed',
            description:
              `Proxy admin for ${contract.getName()}(${contract.getAddress()}) ` +
              `was changed from ${lastAdmin} to ${newAdmin}` +
              `\n(detected by func call)`,
            alertId: 'PROXY-ADMIN-CHANGED',
            severity: FindingSeverity.High,
            type: FindingType.Info,
            metadata: { newAdmin: newAdmin.right, lastAdmin: lastAdmin },
            uniqueKey: getUniqueKey(uniqueKey + '-' + contract.getAddress(), blockNumber),
          }),
        )
      }

      this.lastAdmins.set(contract.getAddress(), newAdmin.right)
    }

    return out
  }
}
