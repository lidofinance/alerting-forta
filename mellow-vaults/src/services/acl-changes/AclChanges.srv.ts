import { Finding, FindingSeverity, FindingType } from 'forta-agent'

import { etherscanAddress } from '../../shared/string'

import {
  WHITELISTED_OWNERS,
  OWNABLE_CONTRACTS,
  NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL,
  NEW_OWNER_IS_EOA_REPORT_INTERVAL,
} from 'constants/acl-changes'

import * as E from 'fp-ts/Either'
import { elapsedTime } from '../../shared/time'
import { Logger } from 'winston'
import { networkAlert } from '../../shared/errors'
import type { IAclChangesClient } from './contract'
import { BlockDto } from '../../entity/events'

export class AclChangesSrv {
  private readonly logger: Logger
  private readonly name = 'AclChangesSrv'
  private readonly ethProvider: IAclChangesClient

  constructor(logger: Logger, ethProvider: IAclChangesClient) {
    this.logger = logger
    this.ethProvider = ethProvider
  }

  public initialize(currentBlock: number): null {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(block: BlockDto) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [ownerChangeFindings] = await Promise.all([this.handleOwnerChange(block)])

    findings.push(...ownerChangeFindings)

    this.logger.info(elapsedTime(AclChangesSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleOwnerChange(block: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    const findingsTimestamps = new Map<string, number>()

    const promises = Array.from(OWNABLE_CONTRACTS.keys()).map(async (address: string) => {
      const ownableContract = OWNABLE_CONTRACTS.get(address)
      if (!ownableContract) {
        return
      }

      const curOwner = await this.ethProvider.getContractOwner(address, ownableContract.ownershipMethod, block.number)

      if (E.isLeft(curOwner)) {
        out.push(
          networkAlert(
            curOwner.left,
            `Error in ${AclChangesSrv.name}.${this.handleOwnerChange.name} (uid:3197e652)`,
            `Could not call ethProvider.getOwner for address - ${address}`,
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

      const curOwnerIsContract = await this.ethProvider.isDeployed(curOwner.right, block.number)

      if (E.isLeft(curOwnerIsContract)) {
        out.push(
          networkAlert(
            curOwnerIsContract.left,
            `Error in ${AclChangesSrv.name}.${this.handleOwnerChange.name} (uid:eb602bbc)`,
            `Could not call ethProvider.isDeployed for curOwner - ${curOwner}`,
          ),
        )
        return
      }

      const key = `${address}+${curOwner}`
      const now = block.timestamp
      // skip if reported recently
      const lastReportTimestamp = findingsTimestamps.get(key)
      const interval = curOwnerIsContract.right
        ? NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL
        : NEW_OWNER_IS_EOA_REPORT_INTERVAL
      if (lastReportTimestamp && interval > now - lastReportTimestamp) {
        return
      }

      out.push(
        Finding.fromObject({
          name: curOwnerIsContract.right
            ? '🚨 Vault Contract owner set to address not in whitelist'
            : '🚨🚨🚨 Vault Contract owner set to EOA 🚨🚨🚨',
          description: `${ownableContract.name} contract (${etherscanAddress(address)}) owner is set to ${
            curOwnerIsContract.right ? 'contract' : 'EOA'
          } address ${etherscanAddress(curOwner.right)}`,
          alertId: 'MELLOW-SUSPICIOUS-VAULT-CONTRACT-OWNER',
          type: FindingType.Suspicious,
          severity: curOwnerIsContract.right ? FindingSeverity.High : FindingSeverity.Critical,
          metadata: {
            contract: address,
            name: ownableContract.name,
            owner: curOwner.right,
          },
        }),
      )

      findingsTimestamps.set(key, now)
    })

    await Promise.all(promises)
    return out
  }
}
