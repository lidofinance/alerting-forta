import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'

import { etherscanAddress } from '../../utils/string'

import {
  WHITELISTED_OWNERS,
  OWNABLE_CONTRACTS,
  NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL,
  NEW_OWNER_IS_EOA_REPORT_INTERVAL,
} from '../../utils/constants'

import * as E from 'fp-ts/Either'
import { elapsedTime } from '../../utils/time'
import { Logger } from 'winston'
import { networkAlert } from '../../utils/errors'

export abstract class IAclChangesClient {
  public abstract getContractOwner(
    address: string,
    method: string,
    currentBlock: number,
  ): Promise<E.Either<Error, string>>
  public abstract isDeployed(address: string, blockNumber: number): Promise<E.Either<Error, boolean>>
}

export class AclChangesSrv {
  private readonly logger: Logger
  private readonly name = 'AclChangesSrv'
  private readonly bscClient: IAclChangesClient
  private readonly findingsTimestamps: Map<string, number>

  constructor(logger: Logger, bscClient: IAclChangesClient) {
    this.logger = logger
    this.bscClient = bscClient
    this.findingsTimestamps = new Map<string, number>()
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(block: BlockEvent) {
    const start = new Date().getTime()

    const findings = await this.handleOwnerChange(block)

    this.logger.info(elapsedTime(AclChangesSrv.name + '.' + this.handleBlock.name, start))
    return findings
  }

  public async handleOwnerChange(block: BlockEvent): Promise<Finding[]> {
    const start = new Date().getTime()
    const out: Finding[] = []

    const now = Date.now()

    const promises = Array.from(OWNABLE_CONTRACTS.keys()).map(async (address: string) => {
      const ownableContract = OWNABLE_CONTRACTS.get(address)
      if (!ownableContract) {
        return
      }

      const curOwner = await this.bscClient.getContractOwner(
        address,
        ownableContract.ownershipMethod,
        block.blockNumber,
      )

      if (E.isLeft(curOwner)) {
        out.push(
          networkAlert(
            curOwner.left,
            `Error in ${AclChangesSrv.name}.${this.handleOwnerChange.name} (uid:2e0d0deb)`,
            `Could not call ethProvider.getContractOwner for address - ${address}`,
          ),
        )
        return
      }

      const curOwnerAddress = curOwner.right.toLowerCase()
      if (ownableContract?.ownerAddress && ownableContract?.ownerAddress === curOwnerAddress) {
        return
      }

      if (!ownableContract?.ownerAddress && WHITELISTED_OWNERS.includes(curOwnerAddress)) {
        return
      }

      const curOwnerIsContract = await this.bscClient.isDeployed(curOwner.right, block.blockNumber)

      if (E.isLeft(curOwnerIsContract)) {
        out.push(
          networkAlert(
            curOwnerIsContract.left,
            `Error in ${AclChangesSrv.name}.${this.handleOwnerChange.name} (uid:b700c6ad)`,
            `Could not call ethProvider.isDeployed for curOwner - ${curOwner}`,
          ),
        )
        return
      }

      const key = `${address}+${curOwner}`
      // skip if reported recently
      const lastReportTimestamp = this.findingsTimestamps.get(key)
      const interval = curOwnerIsContract.right
        ? NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL * 1000 // in ms
        : NEW_OWNER_IS_EOA_REPORT_INTERVAL * 1000 // in ms
      if (lastReportTimestamp && interval > now - lastReportTimestamp) {
        return
      }

      out.push(
        Finding.fromObject({
          name: curOwnerIsContract.right
            ? '🚨 BSC a.DI: Contract owner set to address not in whitelist'
            : '🚨🚨🚨 BSC a.DI: Contract owner set to EOA 🚨🚨🚨',
          description: `${ownableContract.name} contract (${etherscanAddress(address)}) owner is set to ${
            curOwnerIsContract.right ? 'contract' : 'EOA'
          } address ${etherscanAddress(curOwner.right)}`,
          alertId: 'BSC-ADI-VAULT-CONTRACT-OWNER',
          type: FindingType.Suspicious,
          severity: curOwnerIsContract.right ? FindingSeverity.High : FindingSeverity.Critical,
          metadata: {
            contract: address,
            name: ownableContract.name,
            owner: curOwner.right,
          },
        }),
      )

      this.findingsTimestamps.set(key, now)
    })

    await Promise.all(promises)

    this.logger.info(elapsedTime(AclChangesSrv.name + '.' + this.handleOwnerChange.name, start))
    return out
  }
}
