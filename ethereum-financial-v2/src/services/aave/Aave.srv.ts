import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { BlockDto } from '../../entity/events'
import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../../utils/errors'
import { elapsedTime } from '../../utils/time'

export interface IAaveClient {
  getStethBalance(address: string, blockNumber: number): Promise<E.Either<Error, BigNumber>>

  getTotalSupply(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  getStableDebtStEthTotalSupply(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  getVariableDebtStEthTotalSupply(blockNumber: number): Promise<E.Either<Error, BigNumber>>
}

const GWEI_DECIMALS = new BigNumber(10).pow(9)
const ASTETH_ETH_1 = GWEI_DECIMALS.times(1)
// 12 hours
const HOURS_12 = 60 * 60 * 12

export class AaveSrv {
  private name = `AaveSrv`

  private readonly logger: Logger
  private readonly ethProvider: IAaveClient

  private readonly aaveAstethAddress: string

  //
  // Cache
  //
  private lastReportedAstEthSupply: number = 0
  private lastReportedStableStEthSupply: number = 0
  private lastReportedVariableStEthSupply: number = 0

  constructor(logger: Logger, ethProvider: IAaveClient, aaveAstethAddress: string) {
    this.logger = logger
    this.ethProvider = ethProvider
    this.aaveAstethAddress = aaveAstethAddress
  }

  public async handleBlock(blockEvent: BlockDto) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [astEthSupplyFindings, stableStEthSupplyFindings, variableStEthSupplyFindings] = await Promise.all([
      this.handleAstEthSupply(blockEvent),
      this.handleStableStEthSupply(blockEvent),
      this.handleVariableStEthSupply(blockEvent),
    ])

    findings.push(...astEthSupplyFindings, ...stableStEthSupplyFindings, ...variableStEthSupplyFindings)
    this.logger.info(elapsedTime(AaveSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  async handleAstEthSupply(blockEvent: BlockDto): Promise<Finding[]> {
    if (this.lastReportedAstEthSupply + HOURS_12 < blockEvent.timestamp) {
      const [astEthBalance, astEthTotalSupply] = await Promise.all([
        this.ethProvider.getStethBalance(this.aaveAstethAddress, blockEvent.number - 1),
        await this.ethProvider.getTotalSupply(blockEvent.number - 1),
      ])

      if (E.isLeft(astEthBalance)) {
        return [
          networkAlert(
            astEthBalance.left,
            `Error in ${AaveSrv.name}.${this.handleAstEthSupply.name}:51`,
            `Could not call ethProvider.getStEthBalance`,
          ),
        ]
      }

      if (E.isLeft(astEthTotalSupply)) {
        return [
          networkAlert(
            astEthTotalSupply.left,
            `Error in ${AaveSrv.name}.${this.handleAstEthSupply.name}:51`,
            `Could not call ethProvider.getTotalSupply`,
          ),
        ]
      }

      const difference = astEthBalance.right.minus(astEthTotalSupply.right).abs()

      if (difference.isGreaterThan(ASTETH_ETH_1)) {
        this.lastReportedAstEthSupply = blockEvent.timestamp

        return [
          Finding.fromObject({
            name: '🚨🚨🚨 astETH balance - astEth totalSupply >= 1ETH',
            description:
              `stETH.balanceOf(${this.aaveAstethAddress})` +
              `=${astEthBalance.right.div(GWEI_DECIMALS).toFixed(0)} ` +
              `gwei differs from astETH.totalSupply = ${astEthTotalSupply.right.div(GWEI_DECIMALS).toFixed(0)} gwei by ` +
              `${difference.div(GWEI_DECIMALS).toFixed(0)} gwei.\n` +
              `NOTE: This difference occurred at block ` +
              `${blockEvent.number - 1}`,
            alertId: 'ASTETH-BALANCE-AND-SUPPLY-DIFFERENCE',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        ]
      }
    }

    return []
  }

  async handleStableStEthSupply(blockEvent: BlockDto): Promise<Finding[]> {
    if (this.lastReportedStableStEthSupply + HOURS_12 < blockEvent.timestamp) {
      const stableDebtStEthTotalSupply = await this.ethProvider.getStableDebtStEthTotalSupply(blockEvent.number)
      if (E.isLeft(stableDebtStEthTotalSupply)) {
        return [
          networkAlert(
            stableDebtStEthTotalSupply.left,
            `Error in ${AaveSrv.name}.${this.handleStableStEthSupply.name}:109`,
            `Could not call ethProvider.getStableDebtStEthTotalSupply`,
          ),
        ]
      }

      if (stableDebtStEthTotalSupply.right.isGreaterThan(0)) {
        this.lastReportedStableStEthSupply = blockEvent.timestamp
        return [
          Finding.fromObject({
            name: '🚨🚨🚨 stableDebtStETH totalSupply is not 0',
            description: `stableDebtStETH totalSupply is ${stableDebtStEthTotalSupply.right.toFixed()}`,
            alertId: 'STABLE-DEBT-STETH-SUPPLY',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        ]
      }
    }

    return []
  }

  async handleVariableStEthSupply(blockEvent: BlockDto): Promise<Finding[]> {
    if (this.lastReportedVariableStEthSupply + HOURS_12 < blockEvent.timestamp) {
      const variableDebtStEthTotalSupply = await this.ethProvider.getVariableDebtStEthTotalSupply(blockEvent.number)
      if (E.isLeft(variableDebtStEthTotalSupply)) {
        return [
          networkAlert(
            variableDebtStEthTotalSupply.left,
            `Error in ${AaveSrv.name}.${this.handleVariableStEthSupply.name}:146`,
            `Could not call ethProvider.getStableDebtStEthTotalSupply`,
          ),
        ]
      }

      if (variableDebtStEthTotalSupply.right.isGreaterThan(0)) {
        this.lastReportedVariableStEthSupply = blockEvent.timestamp
        return [
          Finding.fromObject({
            name: '🚨🚨🚨 variableDebtStETH totalSupply is not 0',
            description: `variableDebtStETH totalSupply is ${variableDebtStEthTotalSupply.right.toFixed()}`,
            alertId: 'VARIABLE-DEBT-STETH-SUPPLY',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        ]
      }
    }

    return []
  }
}
