import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { ethers, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { NetworkError, networkAlert } from '../../shared/errors'
import { elapsedTime } from '../../shared/time'
import {
  HOURS_24_IN_BLOCK,
  HOURS_48_IN_BLOCK,
  MELLOW_SYMBIOTIC_ADDRESS,
  PERIODICAL_BLOCK_INTERVAL,
  VaultConfig,
  VAULT_LIST,
} from 'constants/common'
import { aclNotices, MELLOW_VAULT_STRATEGY_ACL_EVENTS } from '../../utils/events/acl_events'
import { handleEventsOfNotice } from '../../shared/notice'
import { vaultLimitNotice, MELLOW_VAULT_INCREASE_LIMIT_EVENT } from '../../utils/events/limit_events'
import {
  processWithdrawalsAllNotices,
  processWithdrawalsPartNotices,
  MELLOW_VAULT_PROCESS_WITHDRAWALS_EVENT,
} from '../../utils/events/withdrawals_events'
import { LogDescription } from '@ethersproject/abi'
import { BlockDto, TransactionDto } from '../../entity/events'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class IVaultWatcherClient {
  public abstract getVaultTotalSupply(vaultIndex: number, blockHash: number): Promise<E.Either<Error, BigNumber>>
  public abstract getVaultUnderlyingTvl(vaultIndex: number, blockHash: number): Promise<E.Either<Error, BigNumber>>
  public abstract getVaultPendingWithdrawersCount(
    vaultIndex: number,
    blockNumber: number,
  ): Promise<E.Either<Error, BigNumber>>

  public abstract getDefaultBondStrategyWithdrawalEvents(
    fromBlock: number,
    toBlock: number,
    vaultIndex: number,
  ): Promise<E.Either<Error, LogDescription[]>>

  public abstract getVaultConfiguratorMaxTotalSupply(
    vaultIndex: number,
    blockHash: number,
  ): Promise<E.Either<Error, BigNumber>>
  public abstract getVaultConfigurationStorage(vaultIndex: number, blockHash: number): Promise<E.Either<Error, VaultConfig>>

  public abstract getSymbioticWstTotalSupply(blockNumber: number): Promise<E.Either<Error, BigNumber>>
  public abstract getSymbioticWstLimit(blockNumber: number): Promise<E.Either<Error, BigNumber>>
}

const vaultConfigs: VaultConfig[] = []

export class VaultWatcherSrv {
  private readonly logger: Logger
  private readonly ethClient: IVaultWatcherClient
  private readonly name = 'VaultWatcherSrv'

  constructor(logger: Logger, ethClient: IVaultWatcherClient) {
    this.logger = logger
    this.ethClient = ethClient
  }

  async initialize(currentBlock: number): Promise<NetworkError | null> {
    const start = new Date().getTime()

    try {
      const results = await Promise.all(
        VAULT_LIST.map(async (vault, index) => {
          const vaultConfig = await this.ethClient.getVaultConfigurationStorage(index, currentBlock)
          if (E.isLeft(vaultConfig)) {
            throw vaultConfig.left
          }
          return vaultConfig.right
        }),
      )

      results.forEach((result, index) => {
        vaultConfigs[index] = result
      })
    } catch (err) {
      const error = err as Error
      return new NetworkError(error, `Could not call ethProvider.getVaultConfigurationStorage`)
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const findings: Finding[] = []

    const limitFindings = handleEventsOfNotice(
      txEvent,
      [MELLOW_VAULT_INCREASE_LIMIT_EVENT],
      MELLOW_SYMBIOTIC_ADDRESS,
      vaultLimitNotice,
    )
    const aclFindings = this.handleAclChanges(txEvent)
    const withdrawalFindings = this.handleWithdrawals(txEvent)

    findings.push(...limitFindings, ...aclFindings, ...withdrawalFindings)

    return findings
  }

  public async handleBlock(block: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []
    const [
      limitsIntegrityFindings,
      handleWstETHIntegrityFindings,
      handleVaultConfigurationChangeFindings,
      handleSymbioticWstETHLimitFindings,
      handleNoWithdrawalFindings,
    ] = await Promise.all([
      this.handleLimitsIntegrity(block),
      this.handleWstETHIntegrity(block),
      this.handleVaultConfigurationChange(block),
      this.handleSymbioticWstETHLimit(block),
      this.handleNoWithdrawal(block),
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

  private handleAclChanges(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []
    VAULT_LIST.forEach((vault) => {
      const findings = handleEventsOfNotice(
        txEvent,
        MELLOW_VAULT_STRATEGY_ACL_EVENTS,
        vault.defaultBondStrategy,
        aclNotices,
      )
      out.push(...findings)
    })

    return out
  }

  private handleWithdrawals(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const all = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('processAll()')).substring(2, 10).toLowerCase()

    VAULT_LIST.forEach((vault) => {
      const isProcessAll =
        txEvent.transaction.data.includes(all) &&
        ([vault.defaultBondStrategy, vault.curator].includes(`${txEvent.to}`.toLowerCase()) ||
          txEvent.transaction.data.includes(vault.curator.substring(2)))
      // all can be function or function inside transaction
      const notices = isProcessAll ? processWithdrawalsAllNotices : processWithdrawalsPartNotices

      const findings = handleEventsOfNotice(
        txEvent,
        [MELLOW_VAULT_PROCESS_WITHDRAWALS_EVENT],
        vault.defaultBondStrategy,
        notices,
      )
      out.push(...findings)
    })

    return out
  }

  private async handleVaultConfigurationChange(block: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []
    // Check one vault config every block
    const vaultIdx = block.number % VAULT_LIST.length
    const vaultConfig = await this.ethClient.getVaultConfigurationStorage(vaultIdx, block.number)
    if (E.isLeft(vaultConfig)) {
      out.push(
        networkAlert(
          vaultConfig.left,
          `Error in ${VaultWatcherSrv.name}.${this.handleVaultConfigurationChange.name} (uid:4184fae3)`,
          `Could not call ethProvider.getVaultConfigurationStorage`,
        ),
      )
      return out
    }

    const vault = VAULT_LIST[vaultIdx]
    const vaultConfigPrev = vaultConfigs[vaultIdx]
    const keys = Object.keys(vaultConfigPrev)

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
      const slotName = key as keyof VaultConfig
      if (vaultConfig.right[slotName] !== vaultConfigPrev?.[slotName]) {
        out.push(
          Finding.fromObject({
            name: `🚨🚨🚨 Vault critical storage slot value changed`,
            description:
              `Mellow Vault [${vault?.name}] ` +
              `Value of the storage slot \`'${slotName}'\` ` +
              `for contract ${vault.vault} has changed!` +
              `\nPrev value: ${vaultConfigPrev?.[slotName]}` +
              `\nNew value: ${vaultConfig.right[slotName]}`,
            alertId: 'MELLOW-VAULT-STORAGE-SLOT-VALUE-CHANGED',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
        vaultConfigPrev[slotName] = vaultConfig.right[slotName]
      }
    })

    return out
  }

  private async handleLimitsIntegrity(block: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    const results = await Promise.all(
      VAULT_LIST.map(async (vault, index) => {
        const [vaultTotalSupply, vaultConfiguratorMaxTotalSupply] = await Promise.all([
          this.ethClient.getVaultTotalSupply(index, block.number),
          this.ethClient.getVaultConfiguratorMaxTotalSupply(index, block.number),
        ])
        if (E.isLeft(vaultTotalSupply)) {
          return networkAlert(
            vaultTotalSupply.left as unknown as Error,
            `Error in ${VaultWatcherSrv.name}.${this.handleLimitsIntegrity.name} (uid:b40215f2)`,
            `Could not call ethProvider.getVaultTotalSupply`,
          )
        }

        if (E.isLeft(vaultConfiguratorMaxTotalSupply)) {
          return networkAlert(
            vaultConfiguratorMaxTotalSupply.left as unknown as Error,
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
      } else if (result.eq.gt(0) && block.number % PERIODICAL_BLOCK_INTERVAL == 0) {
        out.push(
          Finding.fromObject({
            name: '⚠️ Vault totalSupply reached maximalTotalSupply',
            description: `Mellow Vault [${result?.name}] (${result.address}) - maximalTotalSupply reached`,
            alertId: 'VAULT-LIMITS-INTEGRITY-REACHED-TO-MAX',
            severity: FindingSeverity.Medium,
            type: FindingType.Suspicious,
          }),
        )
      } else if (result.near.gt(0) && block.number % PERIODICAL_BLOCK_INTERVAL == 0) {
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

  private async handleWstETHIntegrity(block: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    const results = await Promise.all(
      VAULT_LIST.map(async (vault, index) => {
        const [vaultTotalSupply, vaultUnderlyingTvl] = await Promise.all([
          this.ethClient.getVaultTotalSupply(index, block.number),
          this.ethClient.getVaultUnderlyingTvl(index, block.number),
        ])

        if (E.isLeft(vaultTotalSupply)) {
          return networkAlert(
            vaultTotalSupply.left as unknown as Error,
            `Error in ${VaultWatcherSrv.name}.${this.handleWstETHIntegrity.name} (uid:9e488c8c)`,
            `Could not call ethProvider.getVaultTotalSupply`,
          )
        }

        if (E.isLeft(vaultUnderlyingTvl)) {
          return networkAlert(
            vaultUnderlyingTvl.left as unknown as Error,
            `Error in ${VaultWatcherSrv.name}.${this.handleWstETHIntegrity.name} (uid:db70b1bb)`,
            `Could not call ethProvider.getVaultUnderlyingTvl`,
          )
        }

        if (vaultUnderlyingTvl.right.lt(1)) {
          return networkAlert(
            new Error(`vault ${VaultWatcherSrv.name} underlyingTvl is too low`),
            `Error in ${VaultWatcherSrv.name}.${this.handleWstETHIntegrity.name} (uid:db70b1zb)`,
            `Could not call ethProvider.getVaultUnderlyingTvl`,
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

  private async handleSymbioticWstETHLimit(block: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    if (block.number % PERIODICAL_BLOCK_INTERVAL != 0) {
      return out
    }

    const [symbioticWstTotalSupply, symbioticWstLimit] = await Promise.all([
      this.ethClient.getSymbioticWstTotalSupply(block.number),
      this.ethClient.getSymbioticWstLimit(block.number),
    ])

    if (E.isLeft(symbioticWstTotalSupply)) {
      out.push(
        networkAlert(
          symbioticWstTotalSupply.left as unknown as Error,
          `Error in ${VaultWatcherSrv.name}.${this.handleSymbioticWstETHLimit.name} (uid:ba6e5954)`,
          `Could not call ethProvider.getSymbioticWstTotalSupply`,
        ),
      )
      return out
    }

    if (E.isLeft(symbioticWstLimit)) {
      out.push(
        networkAlert(
          symbioticWstLimit.left as unknown as Error,
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

  private async handleNoWithdrawal(block: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    if (block.number % HOURS_24_IN_BLOCK != 0) {
      return out
    }

    const results = await Promise.all(
      VAULT_LIST.map(async (vault, index) => {
        const [pendingCount, withdrawalEvents] = await Promise.all([
          this.ethClient.getVaultPendingWithdrawersCount(index, block.number),
          this.ethClient.getDefaultBondStrategyWithdrawalEvents(block.number - HOURS_48_IN_BLOCK, block.number, index),
        ])

        if (E.isLeft(withdrawalEvents)) {
          return networkAlert(
            withdrawalEvents.left as unknown as Error,
            `Error in ${VaultWatcherSrv.name}.${this.handleWstETHIntegrity.name} (uid:94ca798e)`,
            `Could not call ethProvider.getDefaultBondStrategyWithdrawalEvents`,
          )
        }

        if (E.isLeft(pendingCount)) {
          return networkAlert(
            pendingCount.left as unknown as Error,
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
