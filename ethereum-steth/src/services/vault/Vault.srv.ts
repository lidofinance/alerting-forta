import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../../utils/constants'
import * as E from 'fp-ts/Either'
import { elapsedTime } from '../../utils/time'
import { toEthString } from '../../utils/string'
import { ETHDistributedEvent } from '../../generated/typechain/Lido'
import { TRANSFER_SHARES_EVENT } from '../../utils/events/vault_events'
import { Logger } from 'winston'
import { networkAlert } from '../../utils/errors'
import { BlockDto, TransactionDto } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { ethers } from 'forta-agent'

const ONCE_PER_100_BLOCKS = 100
const ETH_1K = ETH_DECIMALS.times(1000)
const ETH_50 = ETH_DECIMALS.times(50)

export abstract class IVaultClient {
  public abstract getBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getBalanceByBlockHash(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>>

  public abstract getETHDistributedEvent(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, ETHDistributedEvent | null>>
}

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

  public async handleBlock(blockDto: BlockDto) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const currentBlock = blockDto.number
    const prevBlockWithdrawalVaultBalance = await this.ethProvider.getBalanceByBlockHash(
      this.withdrawalsVaultAddress,
      blockDto.parentHash,
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
      blockDto.parentHash,
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
    if (blockNumber % ONCE_PER_100_BLOCKS === 0) {
      const report = await this.ethProvider.getETHDistributedEvent(blockNumber - ONCE_PER_100_BLOCKS, blockNumber)
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
        blockNumber - ONCE_PER_100_BLOCKS,
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

      if (withdrawalVaultBalanceDiff.gte(ETH_1K)) {
        const f: Finding = new Finding()
        f.setName('ℹ️ Withdrawal Vault Balance significant change')
        f.setDescription(
          `Withdrawal Vault Balance has increased by ${toEthString(
            withdrawalVaultBalanceDiff,
          )} during the last ${ONCE_PER_100_BLOCKS} blocks`,
        )
        f.setAlertid('WITHDRAWAL-VAULT-BALANCE-CHANGE')
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
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
    if (elVaultBalanceDiff.gte(ETH_50)) {
      const f: Finding = new Finding()
      f.setName('ℹ️ EL Vault Balance significant change')
      f.setDescription(`EL Vault Balance has increased by ${toEthString(elVaultBalanceDiff)}`)
      f.setAlertid('EL-VAULT-BALANCE-CHANGE')
      f.setSeverity(Finding.Severity.INFO)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      out.push(f)
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
        const f: Finding = new Finding()
        f.setName('🚨🚨🚨 Withdrawal Vault balance mismatch. [without oracle report]')
        f.setDescription(
          `Withdrawal Vault Balance has decreased by ${toEthString(
            prevBalance.minus(currentBalance.right),
          )} without Oracle report`,
        )
        f.setAlertid('WITHDRAWAL-VAULT-BALANCE-DRAIN')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        out.push(f)
      }

      return out
    }

    const withdrawalsWithdrawn = new BigNumber(String(report.args.withdrawalsWithdrawn))
    const expectedBalance = prevBalance.minus(withdrawalsWithdrawn)

    if (currentBalance.right.lt(expectedBalance)) {
      const f: Finding = new Finding()
      f.setName('🚨🚨🚨 Withdrawal Vault balance mismatch. [within oracle report]')
      f.setDescription(
        `Withdrawal Vault Balance has decreased by ${toEthString(
          expectedBalance.minus(currentBalance.right),
        )} but Oracle report shows ${toEthString(withdrawalsWithdrawn)}`,
      )
      f.setAlertid('WITHDRAWAL-VAULT-BALANCE-DRAIN')
      f.setSeverity(Finding.Severity.CRITICAL)
      f.setType(Finding.FindingType.SUSPICIOUS)
      f.setProtocol('ethereum')

      out.push(f)
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
        const f: Finding = new Finding()
        f.setName('🚨🚨🚨 EL Vault balance mismatch. [without oracle report]')
        f.setDescription(
          `EL Vault Balance has decreased by ${toEthString(
            prevBalance.minus(currentBalance.right),
          )} without Oracle report`,
        )
        f.setAlertid('EL-VAULT-BALANCE-DRAIN')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        out.push(f)
      }

      return out
    }

    const executionLayerRewardsWithdrawn = new BigNumber(String(report.args.executionLayerRewardsWithdrawn))
    const expectedBalance = prevBalance.minus(executionLayerRewardsWithdrawn)

    if (currentBalance.right.lt(expectedBalance)) {
      const f: Finding = new Finding()
      f.setName('🚨🚨🚨 EL Vault balance mismatch. [within oracle report]')
      f.setDescription(
        `EL Vault Balance has decreased by ${toEthString(
          expectedBalance.minus(currentBalance.right),
        )} but Oracle report shows ${toEthString(executionLayerRewardsWithdrawn)}`,
      )
      f.setAlertid('EL-VAULT-BALANCE-DRAIN')
      f.setSeverity(Finding.Severity.CRITICAL)
      f.setType(Finding.FindingType.SUSPICIOUS)
      f.setProtocol('ethereum')

      out.push(f)
    }

    return out
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    return this.handleBurnerSharesTx(txEvent)
  }

  public handleBurnerSharesTx(txEvent: TransactionDto): Finding[] {
    const iface = new ethers.utils.Interface([TRANSFER_SHARES_EVENT])
    const out: Finding[] = []
    for (const log of txEvent.logs) {
      if (log.address.toLowerCase() !== this.lidoStethAddress.toLowerCase()) {
        continue
      }

      try {
        const event = iface.parseLog(log)
        if (event.args.from.toLowerCase() === this.burnerAddress.toLowerCase()) {
          const f: Finding = new Finding()
          f.setName('🚨 Burner shares transfer')
          f.setDescription(`Burner shares transfer to ${event.args.to} has occurred`)
          f.setAlertid('BURNER-SHARES-TRANSFER')
          f.setSeverity(Finding.Severity.HIGH)
          f.setType(Finding.FindingType.SUSPICIOUS)
          f.setProtocol('ethereum')

          out.push(f)
        }
      } catch (e) {
        // Only one from eventsOfNotice could be correct
        // Others - skipping
      }
    }

    return out
  }
}
