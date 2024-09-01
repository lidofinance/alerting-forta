import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { BlockDto } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { networkAlert } from '../../utils/errors'
import { elapsedTime } from '../../utils/time'

export interface IAaveClient {
  getStethBalance(lidoStethAddress: string, blockTag: number | string): Promise<E.Either<Error, BigNumber>>

  getTotalSupply(blockHash: string): Promise<E.Either<Error, BigNumber>>

  getStableDebtStEthTotalSupply(blockTag: number | string): Promise<E.Either<Error, BigNumber>>

  getVariableDebtStEthTotalSupply(blockTag: number | string): Promise<E.Either<Error, BigNumber>>
}

const GWEI_DECIMALS = new BigNumber(10).pow(9)
const ASTETH_ETH_1 = GWEI_DECIMALS.times(1)
const MINUTES_10 = 60 * 10

export class AaveSrv {
  private name = `AaveSrv`

  private readonly logger: Logger
  private readonly ethProvider: IAaveClient

  private readonly aaveAstethAddress: string

  //
  // Cache
  //
  private lastReportedAstEthSupplyTimestamp: number = 0
  private lastReportedStableStEthSupplyTimestamp: number = 0
  private lastReportedVariableStEthSupplyTimestamp: number = 0

  constructor(logger: Logger, ethProvider: IAaveClient, aaveAstethAddress: string) {
    this.logger = logger
    this.ethProvider = ethProvider
    this.aaveAstethAddress = aaveAstethAddress
  }

  public async handleBlock(blockEvent: BlockDto): Promise<Finding[]> {
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
    if (this.lastReportedAstEthSupplyTimestamp + MINUTES_10 < blockEvent.timestamp) {
      const [astEthBalance, astEthTotalSupply] = await Promise.all([
        this.ethProvider.getStethBalance(this.aaveAstethAddress, blockEvent.parentHash),
        this.ethProvider.getTotalSupply(blockEvent.parentHash),
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
        this.lastReportedAstEthSupplyTimestamp = blockEvent.timestamp

        const f = new Finding()
        f.setName('🚨🚨🚨 astETH balance - astETH totalSupply >= 1ETH')
        f.setDescription(
          `stETH.balanceOf(${this.aaveAstethAddress})` +
            `=${astEthBalance.right.div(GWEI_DECIMALS).toFixed(0)} ` +
            `gwei differs from astETH.totalSupply = ${astEthTotalSupply.right.div(GWEI_DECIMALS).toFixed(0)} gwei by ` +
            `${difference.div(GWEI_DECIMALS).toFixed(0)} gwei.\n` +
            `NOTE: This difference occurred at block ` +
            `${blockEvent.number - 1}`,
        )
        f.setAlertid('ASTETH-BALANCE-AND-SUPPLY-DIFFERENCE')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        return [f]
      }
    }

    return []
  }

  async handleStableStEthSupply(blockEvent: BlockDto): Promise<Finding[]> {
    if (this.lastReportedStableStEthSupplyTimestamp + MINUTES_10 < blockEvent.timestamp) {
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
        this.lastReportedStableStEthSupplyTimestamp = blockEvent.timestamp

        const f = new Finding()
        f.setName('🚨🚨🚨 stableDebtStETH totalSupply is not 0')
        f.setDescription(`stableDebtStETH totalSupply is ${stableDebtStEthTotalSupply.right.toFixed()}`)
        f.setAlertid('STABLE-DEBT-STETH-SUPPLY')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        return [f]
      }
    }

    return []
  }

  async handleVariableStEthSupply(blockEvent: BlockDto): Promise<Finding[]> {
    if (this.lastReportedVariableStEthSupplyTimestamp + MINUTES_10 < blockEvent.timestamp) {
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
        this.lastReportedVariableStEthSupplyTimestamp = blockEvent.timestamp

        const f = new Finding()
        f.setName('🚨🚨🚨 variableDebtStETH totalSupply is not 0')
        f.setDescription(`variableDebtStETH totalSupply is ${variableDebtStEthTotalSupply.right.toFixed()}`)
        f.setAlertid('VARIABLE-DEBT-STETH-SUPPLY')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        return [f]
      }
    }

    return []
  }
}
