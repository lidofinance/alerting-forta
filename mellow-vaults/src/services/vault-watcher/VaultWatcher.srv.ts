import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { BlockEvent, ethers, Finding, FindingSeverity, FindingType, TransactionEvent } from 'forta-agent'
import { NetworkError, networkAlert } from '../../shared/errors'
import { elapsedTime } from '../../shared/time'
import {
  HOURS_24_IN_BLOCK,
  HOURS_48_IN_BLOCK,
  MELLOW_SYMBIOTIC_ADDRESS,
  PERIODICAL_BLOCK_INTERVAL,
  Storage,
  VAULT_LIST,
} from 'constants/common'
import { getACLEvents } from '../../shared/events/acl_events'
import { handleEventsOfNotice } from '../../shared/notice'
import { getLimitEvents } from '../../shared/events/limit_events'
import { getProcessWithdrawalsEvents, getProcessAllEvents } from '../../shared/events/withdrawals_events'
import { LogDescription } from '@ethersproject/abi'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VaultWatcherClient = {
  getVaultTotalSupply(address: string, blockHash: number): Promise<E.Either<Error, BigNumber>>
  getVaultUnderlyingTvl(address: string, blockHash: number): Promise<E.Either<Error, BigNumber>>
  getVaultPendingWithdrawersCount(address: string, blockNumber: number): Promise<E.Either<Error, BigNumber>>

  getDefaultBondStrategyWithdrawalEvents(
    fromBlock: number,
    toBlock: number,
    address: string,
  ): Promise<E.Either<Error, LogDescription[]>>

  getVaultConfiguratorMaxTotalSupply(address: string, blockHash: number): Promise<E.Either<Error, BigNumber>>
  getVaultConfigurationStorage(address: string, blockHash: number): Promise<E.Either<Error, Storage>>

  getSymbioticWstTotalSupply(blockNumber: number): Promise<E.Either<Error, BigNumber>>
  getSymbioticWstLimit(blockNumber: number): Promise<E.Either<Error, BigNumber>>
}

const vaultStorages: Storage[] = []

export class VaultWatcherSrv {
  private readonly logger: Logger
  private readonly ethClient: VaultWatcherClient
  private readonly name = 'VaultWatcherSrv'

  constructor(logger: Logger, ethClient: VaultWatcherClient) {
    this.logger = logger
    this.ethClient = ethClient
  }

  async initialize(blockNumber: number): Promise<NetworkError | null> {
    const start = new Date().getTime()

    const results = await Promise.all(
      VAULT_LIST.map(async (vault) => {
        const storage = await this.ethClient.getVaultConfigurationStorage(vault.configurator, blockNumber)
        if (E.isLeft(storage)) {
          return networkAlert(
            storage.left as unknown as Error, // TODO
            `Error in ${VaultWatcherSrv.name}.${this.handleVaultConfigurationChange.name} (uid:a9f31f4f)`,
            `Could not call ethProvider.getVaultConfigurationStorage`,
          )
        }
        return storage.right
      }),
    )
    // TODO: make better way to store state
    results.forEach((result, index) => {
      if (result instanceof Finding) {
        vaultStorages[index] = {}
      } else {
        vaultStorages[index] = result
      }
    })

    this.logger.info(elapsedTime(VaultWatcherSrv.name + '.' + this.initialize.name, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public handleTransaction(txEvent: TransactionEvent): Finding[] {
    const findings: Finding[] = []

    const limitFindings = handleEventsOfNotice(txEvent, getLimitEvents())
    findings.push(...limitFindings)
    const aclFindings = this.handleAclChanges(txEvent)
    findings.push(...aclFindings)
    const withdrawalFindings = this.handleWithdrawals(txEvent)
    findings.push(...withdrawalFindings)

    return findings
  }

  public handleAclChanges(txEvent: TransactionEvent): Finding[] {
    const out: Finding[] = []

    VAULT_LIST.forEach((vault) => {
      const findings = handleEventsOfNotice(txEvent, getACLEvents(vault.defaultBondStrategy))
      out.push(...findings)
    })

    return out
  }

  public handleWithdrawals(txEvent: TransactionEvent): Finding[] {
    const out: Finding[] = []

    const all = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('processAll()')).substring(2, 10).toLowerCase()

    VAULT_LIST.forEach((vault) => {
      const isProcessAll =
        txEvent.transaction.data.includes(all) &&
        ([vault.defaultBondStrategy, vault.curator].includes(`${txEvent.transaction.to}`) ||
          txEvent.transaction.data.includes(vault.curator.substring(2)))
      // all can be function or function inside transaction
      const getEvents = isProcessAll ? getProcessAllEvents : getProcessWithdrawalsEvents

      const findings = handleEventsOfNotice(txEvent, getEvents(vault.defaultBondStrategy))
      out.push(...findings)
    })

    return out
  }

  async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [
      limitsIntegrityFindings,
      handleWstETHIntegrityFindings,
      handleVaultConfigurationChangeFindings,
      handleSymbioticWstETHLimitFindings,
      handleNoWithdrawalFindings,
    ] = await Promise.all([
      this.handleLimitsIntegrity(blockEvent),
      this.handleWstETHIntegrity(blockEvent),
      this.handleVaultConfigurationChange(blockEvent),
      this.handleSymbioticWstETHLimit(blockEvent),
      this.handleNoWithdrawal(blockEvent),
    ])
    findings.push(
      ...limitsIntegrityFindings,
      ...handleWstETHIntegrityFindings,
      ...handleVaultConfigurationChangeFindings,
      ...handleSymbioticWstETHLimitFindings,
      ...handleNoWithdrawalFindings,
    )

    this.logger.info(elapsedTime(VaultWatcherSrv.name + '.' + this.handleBlock.name, start))
    return findings
  }

  private async handleVaultConfigurationChange(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []
    const results = await Promise.all(
      VAULT_LIST.map(async (vault) => {
        const storage = await this.ethClient.getVaultConfigurationStorage(vault.configurator, blockEvent.blockNumber)
        if (E.isLeft(storage)) {
          return networkAlert(
            storage.left as unknown as Error, // TODO
            `Error in ${VaultWatcherSrv.name}.${this.handleVaultConfigurationChange.name} (uid:4184fae3)`,
            `Could not call ethProvider.getVaultConfigurationStorage`,
          )
        }
        return storage.right
      }),
    )

    results.forEach((storageOrError, index) => {
      if (storageOrError instanceof Finding) {
        out.push(storageOrError)
        return
      }
      const currentStorage = storageOrError
      const vault = VAULT_LIST[index]
      const vaultStorage = vaultStorages[index]
      const keys = Object.keys(vaultStorage)

      if (!keys.length) {
        out.push(
          Finding.fromObject({
            name: `🚨 Vault critical storage not loaded`,
            description: `Mellow Vault [${vault?.name}] can't load of the storage for contract ${vault.vault}`,
            alertId: 'MELLOW-VAULT-STORAGE-NOT-LOADED',
            severity: FindingSeverity.High,
            type: FindingType.Suspicious,
          }),
        )
      }

      keys.forEach((key) => {
        const slotName = key as keyof Storage
        if (currentStorage[slotName] !== vaultStorage?.[slotName]) {
          out.push(
            Finding.fromObject({
              name: `🚨🚨🚨 Vault critical storage slot value changed`,
              description:
                `Mellow Vault [${vault?.name}] ` +
                `Value of the storage slot \`'${slotName}'\` ` +
                `for contract ${vault.vault} has changed!` +
                `\nPrev value: ${vaultStorage?.[slotName]}` +
                `\nNew value: ${currentStorage[slotName]}`,
              alertId: 'MELLOW-VAULT-STORAGE-SLOT-VALUE-CHANGED',
              severity: FindingSeverity.Critical,
              type: FindingType.Suspicious,
            }),
          )
          vaultStorage[slotName] = currentStorage[slotName]
        }
      })
    })
    return out
  }

  private async handleLimitsIntegrity(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []

    const results = await Promise.all(
      VAULT_LIST.map(async (vault) => {
        const [vaultTotalSupply, vaultConfiguratorMaxTotalSupply] = await Promise.all([
          this.ethClient.getVaultTotalSupply(vault.vault, blockEvent.blockNumber),
          this.ethClient.getVaultConfiguratorMaxTotalSupply(vault.configurator, blockEvent.blockNumber),
        ])
        if (E.isLeft(vaultTotalSupply)) {
          return networkAlert(
            vaultTotalSupply.left as unknown as Error, // TODO
            `Error in ${VaultWatcherSrv.name}.${this.handleLimitsIntegrity.name} (uid:b40215f2)`,
            `Could not call ethProvider.getVaultTotalSupply`,
          )
        }

        if (E.isLeft(vaultConfiguratorMaxTotalSupply)) {
          return networkAlert(
            vaultConfiguratorMaxTotalSupply.left as unknown as Error, // TODO
            `Error in ${VaultWatcherSrv.name}.${this.handleLimitsIntegrity.name} (uid:b1de79e4)`,
            `Could not call ethProvider.getVaultConfiguratorMaxTotalSupply`,
          )
        }
        return {
          address: vault.vault,
          name: vault.name,
          diff: vaultTotalSupply.right.minus(vaultConfiguratorMaxTotalSupply.right),
          near: vaultTotalSupply.right.minus(vaultConfiguratorMaxTotalSupply.right.multipliedBy(0.9)),
          eq: vaultTotalSupply.right.minus(vaultConfiguratorMaxTotalSupply.right.multipliedBy(0.9999999)),
        }
      }),
    )

    results.forEach((result) => {
      if (result instanceof Finding) {
        // error case
        out.push(result)
        return
      }
      if (result.diff.gt(0)) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 Vault totalSupply more than maximalTotalSupply',
            description: `Mellow Vault [${result?.name}] (${result.address}) - more than maximalTotalSupply`,
            alertId: 'VAULT-LIMITS-INTEGRITY',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
      } else if (result.eq.gt(0) && blockEvent.blockNumber % PERIODICAL_BLOCK_INTERVAL == 0) {
        out.push(
          Finding.fromObject({
            name: '⚠️ Vault totalSupply reached maximalTotalSupply',
            description: `Mellow Vault [${result?.name}] (${result.address}) - maximalTotalSupply reached`,
            alertId: 'VAULT-LIMITS-INTEGRITY-REACHED-TO-MAX',
            severity: FindingSeverity.Medium,
            type: FindingType.Suspicious,
          }),
        )
      } else if (result.near.gt(0) && blockEvent.blockNumber % PERIODICAL_BLOCK_INTERVAL == 0) {
        out.push(
          Finding.fromObject({
            name: '⚠️ Vault totalSupply close to maximalTotalSupply',
            description: `Mellow Vault [${result?.name}] (${result.address}) - totalSupply more than 90% of maximalTotalSupply`,
            alertId: 'VAULT-LIMITS-INTEGRITY-CLOSE-TO-MAX',
            severity: FindingSeverity.Medium,
            type: FindingType.Suspicious,
          }),
        )
      }
    })

    return out
  }

  private async handleWstETHIntegrity(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []

    const results = await Promise.all(
      VAULT_LIST.map(async (vault) => {
        const [vaultTotalSupply, vaultUnderlyingTvl] = await Promise.all([
          this.ethClient.getVaultTotalSupply(vault.vault, blockEvent.blockNumber),
          this.ethClient.getVaultUnderlyingTvl(vault.vault, blockEvent.blockNumber),
        ])

        if (E.isLeft(vaultTotalSupply)) {
          return networkAlert(
            vaultTotalSupply.left as unknown as Error, // TODO
            `Error in ${VaultWatcherSrv.name}.${this.handleWstETHIntegrity.name} (uid:9e488c8c)`,
            `Could not call ethProvider.getVaultTotalSupply`,
          )
        }

        if (E.isLeft(vaultUnderlyingTvl)) {
          return networkAlert(
            vaultUnderlyingTvl.left as unknown as Error, // TODO
            `Error in ${VaultWatcherSrv.name}.${this.handleWstETHIntegrity.name} (uid:db70b1bb)`,
            `Could not call ethProvider.getVaultConfiguratorMaxTotalSupply`,
          )
        }

        return {
          address: vault.vault,
          name: vault.name,
          supplyToUnderlying: vaultTotalSupply.right.div(vaultUnderlyingTvl.right),
        }
      }),
    )

    results.forEach((result) => {
      if (result instanceof Finding) {
        // error case
        out.push(result)
        return
      }
      if (result.supplyToUnderlying.minus(1).abs().gte(1e-9)) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 Vault vaultTotalSupply and vaultUnderlyingTvl is not the same',
            description: `Mellow Vault [${result?.name}] (${result.address}) - vaultTotalSupply and vaultUnderlyingTvl different`,
            alertId: 'VAULT-WSTETH-LIMITS-INTEGRITY',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
      }
    })

    return out
  }

  private async handleSymbioticWstETHLimit(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []

    if (blockEvent.blockNumber % PERIODICAL_BLOCK_INTERVAL != 0) {
      return out
    }

    const [symbioticWstTotalSupply, symbioticWstLimit] = await Promise.all([
      this.ethClient.getSymbioticWstTotalSupply(blockEvent.blockNumber),
      this.ethClient.getSymbioticWstLimit(blockEvent.blockNumber),
    ])

    if (E.isLeft(symbioticWstTotalSupply)) {
      out.push(
        networkAlert(
          symbioticWstTotalSupply.left as unknown as Error, // TODO
          `Error in ${VaultWatcherSrv.name}.${this.handleSymbioticWstETHLimit.name} (uid:ba6e5954)`,
          `Could not call ethProvider.getSymbioticWstTotalSupply`,
        ),
      )
      return out
    }

    if (E.isLeft(symbioticWstLimit)) {
      out.push(
        networkAlert(
          symbioticWstLimit.left as unknown as Error, // TODO
          `Error in ${VaultWatcherSrv.name}.${this.handleSymbioticWstETHLimit.name} (uid:f01c465b)`,
          `Could not call ethProvider.getSymbioticWstLimit`,
        ),
      )
      return out
    }

    if (symbioticWstLimit.right.minus(symbioticWstTotalSupply.right).abs().lt(1e-9)) {
      out.push(
        Finding.fromObject({
          name: '⚠️ Vault: Symbiotic limit reached',
          description: `Symbiotic - ${MELLOW_SYMBIOTIC_ADDRESS}`,
          alertId: 'VAULT-WSTETH-LIMIT-REACHED',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        }),
      )
    }

    return out
  }

  private async handleNoWithdrawal(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []

    if (blockEvent.blockNumber % HOURS_24_IN_BLOCK != 0) {
      return out
    }

    const results = await Promise.all(
      VAULT_LIST.map(async (vault) => {
        const [pendingCount, withdrawalEvents] = await Promise.all([
          this.ethClient.getVaultPendingWithdrawersCount(vault.vault, blockEvent.blockNumber),
          this.ethClient.getDefaultBondStrategyWithdrawalEvents(
            blockEvent.blockNumber - HOURS_48_IN_BLOCK,
            blockEvent.blockNumber,
            vault.defaultBondStrategy,
          ),
        ])

        if (E.isLeft(withdrawalEvents)) {
          return networkAlert(
            withdrawalEvents.left as unknown as Error, // TODO
            `Error in ${VaultWatcherSrv.name}.${this.handleWstETHIntegrity.name} (uid:94ca798e)`,
            `Could not call ethProvider.getDefaultBondStrategyWithdrawalEvents`,
          )
        }

        if (E.isLeft(pendingCount)) {
          return networkAlert(
            pendingCount.left as unknown as Error, // TODO
            `Error in ${VaultWatcherSrv.name}.${this.handleWstETHIntegrity.name} (uid:5fb6076f)`,
            `Could not call ethProvider.getVaultPendingWithdrawersCount`,
          )
        }

        return {
          address: vault.vault,
          name: vault.name,
          events: withdrawalEvents.right,
          count: pendingCount.right,
        }
      }),
    )

    results.forEach((result) => {
      if (result instanceof Finding) {
        // error case
        out.push(result)
        return
      }

      if (!result.events[0] && result.count.gt(0)) {
        out.push(
          Finding.fromObject({
            name: '⚠️ Vault: Withdrawals haven’t been called for at least 48 hours',
            description: `Mellow Vault [${result?.name}] (${result?.address})`,
            alertId: 'VAULT-NO-WITHDRAWAL-48',
            severity: FindingSeverity.Medium,
            type: FindingType.Suspicious,
          }),
        )
      }
    })

    return out
  }
}
