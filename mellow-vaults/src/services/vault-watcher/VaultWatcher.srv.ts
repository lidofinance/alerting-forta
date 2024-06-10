import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { NetworkError, networkAlert } from 'src/shared/errors'
import { elapsedTime } from 'src/shared/time'
import { Storage, VAULT_LIST } from 'constants/common'
import { getACLEvents } from '../../shared/events/acl_events'
import { handleEventsOfNotice, TransactionEventContract } from '../../shared/notice'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VaultWatcherClient = {
  getVaultTotalSupply(address: string, blockHash: number): Promise<E.Either<Error, BigNumber>>
  getVaultConfiguratorMaxTotalSupply(address: string, blockHash: number): Promise<E.Either<Error, BigNumber>>
  getVaultUnderlyingTvl(address: string, blockHash: number): Promise<E.Either<Error, BigNumber>>
  getVaultConfigurationStorage(address: string, blockHash: number): Promise<E.Either<Error, Storage>>
}

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

    this.logger.info(elapsedTime(VaultWatcherSrv.name + '.' + this.initialize.name, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public handleTransaction(txEvent: TransactionEventContract): Finding[] {
    const findings: Finding[] = []

    const aclFindings = this.handleAclChanges(txEvent)
    findings.push(...aclFindings)

    return findings
  }

  public handleAclChanges(txEvent: TransactionEventContract): Finding[] {
    const findings: Finding[] = []

    VAULT_LIST.forEach((vault) => {
      const aclFindings = handleEventsOfNotice(txEvent, getACLEvents(vault.defaultBondStrategy))
      findings.push(...aclFindings)
    })

    return findings
  }

  async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [limitsIntegrityFindings, handleWstETHIntegrityFindings, handleVaultConfigurationChangeFindings] =
      await Promise.all([
        this.handleLimitsIntegrity(blockEvent),
        this.handleWstETHIntegrity(blockEvent),
        this.handleVaultConfigurationChange(blockEvent),
      ])
    findings.push(
      ...limitsIntegrityFindings,
      ...handleWstETHIntegrityFindings,
      ...handleVaultConfigurationChangeFindings,
    )

    this.logger.info(elapsedTime(VaultWatcherSrv.name + '.' + this.handleBlock.name, start))
    return findings
  }

  public async handleVaultConfigurationChange(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []
    const results = await Promise.all(
      VAULT_LIST.map(async (vault) => {
        const storage = await this.ethClient.getVaultConfigurationStorage(vault.configurator, blockEvent.blockNumber)
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

    results.forEach((storageOrError, index) => {
      if (storageOrError instanceof Finding) {
        out.push(storageOrError)
        return
      }
      const storage = storageOrError
      const vault = VAULT_LIST[index]
      const vaultStorage = vault?.storage
      const keys = Object.keys(storage)
      keys.forEach((key) => {
        const slotName = key as keyof Storage
        if (storage[slotName] !== vaultStorage?.[slotName]) {
          out.push(
            Finding.fromObject({
              name: `🚨 Vault critical storage slot value changed`,
              description:
                `Value of the storage slot \`'${slotName}'\` ` +
                `for contract ${vault.vault} (${vault.name}) has changed!` +
                `\nPrev value: ${vaultStorage?.[slotName]}` +
                `\nNew value: ${storage[slotName]}`,
              alertId: 'VAULT-STORAGE-SLOT-VALUE-CHANGED',
              severity: FindingSeverity.Critical,
              type: FindingType.Suspicious,
            }),
          )
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
          diff: vaultTotalSupply.right.minus(vaultConfiguratorMaxTotalSupply.right),
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
            description: `Vault - ${result.address}`,
            alertId: 'VAULT-LIMITS-INTEGRITY',
            severity: FindingSeverity.Critical,
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
      if (result.supplyToUnderlying.minus(1).abs().gt(1e9)) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 Vault vaultTotalSupply and vaultUnderlyingTvl is almost same',
            description: `Vault - ${result.address}`,
            alertId: 'VAULT-WSTETH-LIMITS-INTEGRITY',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
      }
    })

    return out
  }
}
