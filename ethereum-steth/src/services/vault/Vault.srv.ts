import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../../utils/constants'
import * as E from 'fp-ts/Either'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { elapsedTime } from '../../utils/time'
import { toEthString } from '../../utils/string'
import { ETHDistributedEvent } from '../../generated/Lido'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { TRANSFER_SHARES_EVENT } from '../../utils/events/vault_events'
import { Logger } from 'winston'
import { networkAlert } from '../../utils/errors'
import { IVaultClient } from './contract'

const WITHDRAWAL_VAULT_BALANCE_BLOCK_INTERVAL = 100
const WITHDRAWAL_VAULT_BALANCE_DIFF_INFO = ETH_DECIMALS.times(1000)
const EL_VAULT_BALANCE_DIFF_INFO = ETH_DECIMALS.times(50)

export class VaultSrv {
  private readonly logger: Logger
  private readonly name = 'VaultSrv'
  private readonly ethProvider: IVaultClient

  private readonly withdrawalsVaultAddress: string
  private readonly elRewardsVaultAddress: string
  private readonly lidoStethAddress: string
  private readonly burnerAddress: string

  constructor(
    logger: Logger,
    ethProvider: IVaultClient,
    withdrawalsVaultAddress: string,
    elRewardsVaultAddress: string,
    burnerAddress: string,
    lidoStethAddress: string,
  ) {
    this.logger = logger
    this.ethProvider = ethProvider
    this.elRewardsVaultAddress = elRewardsVaultAddress
    this.withdrawalsVaultAddress = withdrawalsVaultAddress
    this.burnerAddress = burnerAddress
    this.lidoStethAddress = lidoStethAddress
  }

  public initialize(currentBlock: number): null {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const currentBlock = blockEvent.block.number
    const prevBlockWithdrawalVaultBalance = await this.ethProvider.getBalanceByBlockHash(
      this.withdrawalsVaultAddress,
      blockEvent.block.parentHash,
    )
    if (E.isLeft(prevBlockWithdrawalVaultBalance)) {
      return [
        networkAlert(
          prevBlockWithdrawalVaultBalance.left,
          `Error in ${VaultSrv.name}.${this.handleBlock.name}:63`,
          `Could not call ethProvider.getBalanceByBlockHash`,
        ),
      ]
    }
    const prevBlockElVaultBalance = await this.ethProvider.getBalanceByBlockHash(
      this.elRewardsVaultAddress,
      blockEvent.block.parentHash,
    )
    if (E.isLeft(prevBlockElVaultBalance)) {
      return [
        networkAlert(
          prevBlockElVaultBalance.left,
          `Error in ${VaultSrv.name}.${this.handleBlock.name}:76`,
          `Could not call ethProvider.getBalanceByBlockHash`,
        ),
      ]
    }

    const report = await this.ethProvider.getETHDistributedEvent(currentBlock, currentBlock)
    if (E.isLeft(report)) {
      return [
        networkAlert(
          report.left,
          `Error in ${VaultSrv.name}.${this.handleBlock.name}:90`,
          `Could not call ethProvider.getETHDistributedEvent`,
        ),
      ]
    }

    const [
      withdrawalVaultBalanceFindings,
      elVaultBalanceFindings,
      noWithdrawalVaultDrainsFindings,
      noELVaultDrainsFindings,
    ] = await Promise.all([
      this.handleWithdrawalVaultBalance(currentBlock),
      this.handleELVaultBalance(currentBlock, prevBlockElVaultBalance.right),
      this.handleNoWithdrawalVaultDrains(currentBlock, prevBlockWithdrawalVaultBalance.right, report.right),
      this.handleNoELVaultDrains(currentBlock, prevBlockElVaultBalance.right, report.right),
    ])

    findings.push(
      ...withdrawalVaultBalanceFindings,
      ...elVaultBalanceFindings,
      ...noWithdrawalVaultDrainsFindings,
      ...noELVaultDrainsFindings,
    )

    this.logger.info(elapsedTime(VaultSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleWithdrawalVaultBalance(blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []
    if (blockNumber % WITHDRAWAL_VAULT_BALANCE_BLOCK_INTERVAL === 0) {
      const report = await this.ethProvider.getETHDistributedEvent(
        blockNumber - WITHDRAWAL_VAULT_BALANCE_BLOCK_INTERVAL,
        blockNumber,
      )
      if (E.isLeft(report)) {
        return [
          networkAlert(
            report.left,
            `Error in ${VaultSrv.name}.${this.handleWithdrawalVaultBalance.name}:128`,
            `Could not call ethProvider.getETHDistributedEvent`,
          ),
        ]
      }

      const prevWithdrawalVaultBalance = await this.ethProvider.getBalance(
        this.withdrawalsVaultAddress,
        blockNumber - WITHDRAWAL_VAULT_BALANCE_BLOCK_INTERVAL,
      )
      if (E.isLeft(prevWithdrawalVaultBalance)) {
        return [
          networkAlert(
            prevWithdrawalVaultBalance.left,
            `Error in ${VaultSrv.name}.${this.handleWithdrawalVaultBalance.name}:142`,
            `Could not call ethProvider.getBalance`,
          ),
        ]
      }

      const withdrawalVaultBalance = await this.ethProvider.getBalance(this.withdrawalsVaultAddress, blockNumber)
      if (E.isLeft(withdrawalVaultBalance)) {
        return [
          networkAlert(
            withdrawalVaultBalance.left,
            `Error in ${VaultSrv.name}.${this.handleWithdrawalVaultBalance.name}:156`,
            `Could not call ethProvider.getBalance`,
          ),
        ]
      }

      let withdrawalsWithdrawn = new BigNumber(0)
      if (report.right !== null) {
        withdrawalsWithdrawn = new BigNumber(String(report.right.args.withdrawalsWithdrawn))
      }

      const withdrawalVaultBalanceDiff = withdrawalVaultBalance.right
        .minus(prevWithdrawalVaultBalance.right)
        .plus(withdrawalsWithdrawn)

      if (withdrawalVaultBalanceDiff.gte(WITHDRAWAL_VAULT_BALANCE_DIFF_INFO)) {
        out.push(
          Finding.fromObject({
            name: '💵 Withdrawal Vault Balance significant change',
            description: `Withdrawal Vault Balance has increased by ${toEthString(
              withdrawalVaultBalanceDiff,
            )} during the last ${WITHDRAWAL_VAULT_BALANCE_BLOCK_INTERVAL} blocks`,
            alertId: 'WITHDRAWAL-VAULT-BALANCE-CHANGE',
            type: FindingType.Info,
            severity: FindingSeverity.Info,
          }),
        )
      }
    }

    return out
  }

  public async handleELVaultBalance(blockNumber: number, prevBalance: BigNumber): Promise<Finding[]> {
    const elVaultBalance = await this.ethProvider.getBalance(this.elRewardsVaultAddress, blockNumber)
    if (E.isLeft(elVaultBalance)) {
      return [
        networkAlert(
          elVaultBalance.left,
          `Error in ${VaultSrv.name}.${this.handleELVaultBalance.name}:195`,
          `Could not call ethProvider.getBalance`,
        ),
      ]
    }

    const elVaultBalanceDiff = elVaultBalance.right.minus(prevBalance)

    const out: Finding[] = []
    if (elVaultBalanceDiff.gte(EL_VAULT_BALANCE_DIFF_INFO)) {
      out.push(
        Finding.fromObject({
          name: '💵 EL Vault Balance significant change',
          description: `EL Vault Balance has increased by ${toEthString(elVaultBalanceDiff)}`,
          alertId: 'EL-VAULT-BALANCE-CHANGE',
          type: FindingType.Info,
          severity: FindingSeverity.Info,
        }),
      )
    }

    return out
  }

  public async handleNoWithdrawalVaultDrains(
    currentBlock: number,
    prevBalance: BigNumber,
    report: ETHDistributedEvent | null,
  ): Promise<Finding[]> {
    const out: Finding[] = []
    const currentBalance = await this.ethProvider.getBalance(this.withdrawalsVaultAddress, currentBlock)
    if (E.isLeft(currentBalance)) {
      return [
        networkAlert(
          currentBalance.left,
          `Error in ${VaultSrv.name}.${this.handleNoWithdrawalVaultDrains.name}:230`,
          `Could not call ethProvider.getBalance`,
        ),
      ]
    }

    if (report === null) {
      if (currentBalance.right.lt(prevBalance)) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 Withdrawal Vault balance mismatch. [without oracle report]',
            description: `Withdrawal Vault Balance has decreased by ${toEthString(
              prevBalance.minus(currentBalance.right),
            )} without Oracle report`,
            alertId: 'WITHDRAWAL-VAULT-BALANCE-DRAIN',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
      }

      return out
    }

    const withdrawalsWithdrawn = new BigNumber(String(report.args.withdrawalsWithdrawn))
    const expectedBalance = prevBalance.minus(withdrawalsWithdrawn)

    if (currentBalance.right.lt(expectedBalance)) {
      out.push(
        Finding.fromObject({
          name: '🚨🚨🚨 Withdrawal Vault balance mismatch. [within oracle report]',
          description: `Withdrawal Vault Balance has decreased by ${toEthString(
            expectedBalance.minus(currentBalance.right),
          )} but Oracle report shows ${toEthString(withdrawalsWithdrawn)}`,
          alertId: 'WITHDRAWAL-VAULT-BALANCE-DRAIN',
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        }),
      )
    }

    return out
  }

  public async handleNoELVaultDrains(
    currentBlock: number,
    prevBalance: BigNumber,
    report: ETHDistributedEvent | null,
  ): Promise<Finding[]> {
    const currentBalance = await this.ethProvider.getBalance(this.elRewardsVaultAddress, currentBlock)
    if (E.isLeft(currentBalance)) {
      return [
        networkAlert(
          currentBalance.left,
          `Error in ${VaultSrv.name}.${this.handleNoELVaultDrains.name}:284`,
          `Could not call ethProvider.getBalance`,
        ),
      ]
    }

    const out: Finding[] = []
    if (report === null) {
      if (currentBalance.right.lt(prevBalance)) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 EL Vault balance mismatch. [without oracle report]',
            description: `EL Vault Balance has decreased by ${toEthString(
              prevBalance.minus(currentBalance.right),
            )} without Oracle report`,
            alertId: 'EL-VAULT-BALANCE-DRAIN',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
      }

      return out
    }

    const executionLayerRewardsWithdrawn = new BigNumber(String(report.args.executionLayerRewardsWithdrawn))
    const expectedBalance = prevBalance.minus(executionLayerRewardsWithdrawn)

    if (currentBalance.right.lt(expectedBalance)) {
      out.push(
        Finding.fromObject({
          name: '🚨🚨🚨 EL Vault balance mismatch. [within oracle report]',
          description: `EL Vault Balance has decreased by ${toEthString(
            expectedBalance.minus(currentBalance.right),
          )} but Oracle report shows ${toEthString(executionLayerRewardsWithdrawn)}`,
          alertId: 'EL-VAULT-BALANCE-DRAIN',
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        }),
      )
    }

    return out
  }

  public handleTransaction(txEvent: TransactionEvent): Finding[] {
    return this.handleBurnerSharesTx(txEvent)
  }

  public handleBurnerSharesTx(txEvent: TransactionEvent): Finding[] {
    const events = txEvent
      .filterLog(TRANSFER_SHARES_EVENT, this.lidoStethAddress)
      .filter((e) => e.args.from.toLowerCase() === this.burnerAddress.toLowerCase())

    const out: Finding[] = []
    for (const event of events) {
      out.push(
        Finding.fromObject({
          name: '🚨 Burner shares transfer',
          description: `Burner shares transfer to ${event.args.to} has occurred`,
          alertId: 'BURNER-SHARES-TRANSFER',
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        }),
      )
    }

    return out
  }
}
