import { Logger } from 'winston'
import { BlockDto } from '../../entity/events'
import { elapsedTime } from '../../utils/time'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { networkAlert, NetworkError } from '../../utils/errors'
import { PoolBalanceCache } from './pool-balance.cache'
import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { ETH_DECIMALS } from '../../utils/constants'

//  MIN_5 Math.ceil((5 * 60) / 13) = 23
//  5 minutes in eth blocks
const MIN_5 = 23
const PERCENT_10 = 10
const PERCENT_5 = 5

const PEG_STEP = 0.005
const PEG_STEP_0_995 = 0.995
const PEG_STEP_0_98 = 0.98

const ONE_HOUR = 60 * 60
const WEEK_1 = 60 * 60 * 24 * 7 // 1 week
const HOURS_24 = 60 * 60 * 24 // 24 hours

const CHAINLINK_STETH_ETH_PAGE = 'https://data.chain.link/ethereum/mainnet/crypto-eth/steth-eth'

export interface IPoolBalanceClient {
  getCurveEthBalance(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  getCurveStEthBalance(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  getCurvePeg(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  getChainlinkPeg(blockNumber: number): Promise<E.Either<Error, BigNumber>>
}

export class PoolBalanceSrv {
  private readonly logger: Logger
  private readonly ethClient: IPoolBalanceClient
  private readonly cache: PoolBalanceCache

  constructor(logger: Logger, ethClient: IPoolBalanceClient, cache: PoolBalanceCache) {
    this.logger = logger
    this.ethClient = ethClient
    this.cache = cache
  }

  async init(blockDto: BlockDto): Promise<NetworkError | null> {
    const start = new Date().getTime()

    const [ethBalance, stEthBalance, ethBalancePrev, stEthBalancePrev, curvePegVal, chainlinkPeg] = await Promise.all([
      this.ethClient.getCurveEthBalance(blockDto.number),
      this.ethClient.getCurveStEthBalance(blockDto.number),

      this.ethClient.getCurveEthBalance(blockDto.number - MIN_5),
      this.ethClient.getCurveStEthBalance(blockDto.number - MIN_5),

      this.ethClient.getCurvePeg(blockDto.number),
      this.ethClient.getChainlinkPeg(blockDto.number),
    ])

    if (E.isLeft(ethBalance)) {
      return ethBalance.left
    }

    if (E.isLeft(stEthBalance)) {
      return stEthBalance.left
    }

    if (E.isLeft(ethBalancePrev)) {
      return ethBalancePrev.left
    }

    if (E.isLeft(stEthBalancePrev)) {
      return stEthBalancePrev.left
    }

    if (E.isLeft(curvePegVal)) {
      return curvePegVal.left
    }

    if (E.isLeft(chainlinkPeg)) {
      return chainlinkPeg.left
    }

    this.cache.curveEthBalance = ethBalance.right
    this.cache.curveStEthBalance = stEthBalance.right
    this.cache.curvePoolSize = this.cache.curveEthBalance.plus(this.cache.curveStEthBalance)

    this.cache.lastReportedImbalance = this.calcImbalance(ethBalancePrev.right, stEthBalancePrev.right)

    if (Math.abs(this.cache.lastReportedImbalance) > PERCENT_10) {
      this.cache.lastReportedImbalanceTimestamp = blockDto.timestamp
    }

    this.cache.lastReportedCurvePegLevel = Math.ceil(curvePegVal.right.toNumber() / PEG_STEP) / 100
    this.cache.lastReportedCurvePegValue = curvePegVal.right.toNumber()
    this.cache.lastReportedCurvePegTimestamp = blockDto.timestamp

    this.cache.lastReportedChainlinkPegLevel = Math.ceil(chainlinkPeg.right.toNumber() / PEG_STEP) / 100
    this.cache.lastReportedChainlinkPegTimestamp = blockDto.timestamp

    this.cache.curveUnstakedStEth = this.calculateUnstakedStEth(stEthBalancePrev.right, ethBalancePrev.right)
    this.cache.curveLastReportedUnstakedStEthTimestamp = blockDto.timestamp

    this.logger.info(elapsedTime(PoolBalanceSrv.name + '.' + this.init.name, start))

    return null
  }

  async handleBlock(blockEvent: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [curvePoolImbalanceFindings, curvePegFindings, chainlinPegFindings] = await Promise.all([
      this.handleCurvePool(blockEvent),
      this.handleCurvePeg(blockEvent),
      this.handleChainlinkPeg(blockEvent),
    ])

    const unstakedStEthFindings = this.handleUnstakedStEth(blockEvent)

    findings.push(...curvePoolImbalanceFindings, ...curvePegFindings, ...chainlinPegFindings, ...unstakedStEthFindings)

    this.logger.info(elapsedTime(PoolBalanceSrv.name + '.' + this.handleBlock.name, start))
    return findings
  }

  private async handleCurvePool(blockEvent: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []
    const [ethBalance, stEthBalance] = await Promise.all([
      this.ethClient.getCurveEthBalance(blockEvent.number),
      this.ethClient.getCurveStEthBalance(blockEvent.number),
    ])

    if (E.isLeft(ethBalance)) {
      return [
        networkAlert(
          ethBalance.left,
          `Error in ${PoolBalanceSrv.name}.${this.handleCurvePool.name}:112`,
          `Could not call ethProvider.getCurveEthBalance`,
        ),
      ]
    }

    if (E.isLeft(stEthBalance)) {
      return [
        networkAlert(
          stEthBalance.left,
          `Error in ${PoolBalanceSrv.name}.${this.handleCurvePool.name}:112`,
          `Could not call ethProvider.getCurveStEthBalance`,
        ),
      ]
    }

    const curveImbalance = this.calcImbalance(ethBalance.right, stEthBalance.right)
    this.logger.info(`Curve imbalance: current(${curveImbalance}), prev(${this.cache.lastReportedImbalance})`)

    if (this.cache.lastReportedImbalanceTimestamp + WEEK_1 < blockEvent.timestamp) {
      if (curveImbalance < -PERCENT_10 || curveImbalance > PERCENT_10) {
        out.push(
          Finding.fromObject({
            name: '⚠️ Curve Pool is imbalanced',
            description: `Current pool state:\n` + this.curvePoolToString(ethBalance.right, stEthBalance.right),
            alertId: 'CURVE-POOL-IMBALANCE',
            severity: FindingSeverity.Medium,
            type: FindingType.Suspicious,
          }),
        )

        this.cache.lastReportedImbalanceTimestamp = blockEvent.timestamp
        this.cache.lastReportedImbalance = curveImbalance
      }
    }

    if (this.curvePoolImbalanceRapidlyChanges(curveImbalance)) {
      out.push(
        Finding.fromObject({
          name: '🚨 Curve Pool rapid imbalance change',
          description:
            `Prev reported pool sate:\n` +
            this.curvePoolToString(this.cache.curveEthBalance, this.cache.curveStEthBalance) +
            '\n' +
            `Current pool state:\n` +
            this.curvePoolToString(ethBalance.right, stEthBalance.right),
          alertId: 'CURVE-POOL-IMBALANCE-RAPID-CHANGE',
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        }),
      )
      this.cache.lastReportedImbalanceTimestamp = blockEvent.timestamp
      this.cache.lastReportedImbalance = curveImbalance
    }

    const poolSize = ethBalance.right.plus(stEthBalance.right)
    const poolSizeChange = this.calcPoolSizeChange(poolSize, this.cache.curvePoolSize)

    if (Math.abs(poolSizeChange) > PERCENT_5) {
      let severity = FindingSeverity.Info
      let name = '⚠️ Significant Curve Pool size change'
      if (poolSizeChange < -PERCENT_10 || poolSizeChange > PERCENT_10) {
        severity = FindingSeverity.High
        name = '🚨Significant Curve Pool size change'
      }

      out.push(
        Finding.fromObject({
          name: name,
          description: `Curve Pool size has ${
            poolSizeChange > 0
              ? 'increased by ' + poolSizeChange.toFixed(2).toString()
              : 'decreased by ' + -poolSizeChange.toFixed(2).toString()
          }% since the last block`,
          alertId: 'CURVE-POOL-SIZE-CHANGE',
          severity: severity,
          type: FindingType.Info,
          metadata: {
            sizeBefore: this.cache.curvePoolSize.dividedBy(ETH_DECIMALS).toFixed(),
            sizeAfter: poolSize.dividedBy(ETH_DECIMALS).toFixed(),
          },
        }),
      )
    }

    this.cache.curvePoolSize = poolSize
    this.cache.curveEthBalance = ethBalance.right
    this.cache.curveStEthBalance = stEthBalance.right

    return out
  }

  async handleCurvePeg(blockDto: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []
    const peg = await this.ethClient.getCurvePeg(blockDto.number)
    if (E.isLeft(peg)) {
      return [
        networkAlert(
          peg.left,
          `Error in ${PoolBalanceSrv.name}.${this.handleCurvePeg.name}:224`,
          `Could not call ethProvider.getCurveEthBalance`,
        ),
      ]
    }

    // Division by 100 is required to normalize pegLevel to PEG_STEP
    const pegLevel = Math.ceil(peg.right.toNumber() / PEG_STEP) / 100
    // info on PEG decrease
    if (pegLevel < this.cache.lastReportedCurvePegValue && peg.right.toNumber() < PEG_STEP_0_995) {
      out.push(
        Finding.fromObject({
          name: '⚠️ stETH PEG on Curve decreased',
          description: `stETH PEG on Curve decreased to ${peg.right.toFixed(4)}`,
          alertId: 'STETH-CURVE-PEG-DECREASE',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: {
            peg: peg.right.toFixed(4),
          },
        }),
      )
      this.cache.lastReportedCurvePegValue = peg.right.toNumber()
      this.cache.lastReportedCurvePegLevel = pegLevel
      this.cache.lastReportedCurvePegTimestamp = blockDto.timestamp
    }

    if (this.cache.lastReportedCurvePegTimestamp + HOURS_24 < blockDto.timestamp) {
      if (peg.right.toNumber() <= PEG_STEP_0_98) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 Super low stETH:Eth price on Curve',
            description: `Current stETH PEG on Curve - ${peg.right.toFixed(4)}`,
            alertId: 'LOW-STETH-CURVE-PEG',
            severity: FindingSeverity.Critical,
            type: FindingType.Degraded,
            metadata: {
              peg: peg.right.toFixed(4),
            },
          }),
        )
        this.cache.lastReportedCurvePegValue = peg.right.toNumber()
        this.cache.lastReportedCurvePegLevel = pegLevel
        this.cache.lastReportedCurvePegTimestamp = blockDto.timestamp
      }
    }

    // update PEG vals if PEG goes way back
    if (this.cache.lastReportedCurvePegLevel + PEG_STEP * 2 < pegLevel) {
      this.cache.lastReportedCurvePegValue = peg.right.toNumber()
      this.cache.lastReportedCurvePegLevel = pegLevel
      this.cache.lastReportedCurvePegTimestamp = blockDto.timestamp
    }

    return out
  }

  async handleChainlinkPeg(blockDto: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    const peg = await this.ethClient.getChainlinkPeg(blockDto.number)
    if (E.isLeft(peg)) {
      return [
        networkAlert(
          peg.left,
          `Error in ${PoolBalanceSrv.name}.${this.handleChainlinkPeg.name}:296`,
          `Could not call ethProvider.getChainlinkPeg`,
        ),
      ]
    }

    // Division by 100 is required to normalize pegLevel to PEG_STEP
    const pegLevel = Math.ceil(peg.right.toNumber() / PEG_STEP) / 100
    // info on PEG decrease
    if (pegLevel < this.cache.lastReportedChainlinkPegLevel && peg.right.toNumber() < PEG_STEP_0_995) {
      out.push(
        Finding.fromObject({
          name: '⚠️ stETH:ETH on Chainlink decreased',
          description: `stETH:ETH PEG on Chainlink decreased to ${peg.right.toFixed(4)}, [source](${CHAINLINK_STETH_ETH_PAGE})`,
          alertId: 'STETH-CHAINLINK-PEG-DECREASE',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: {
            peg: peg.right.toFixed(4),
          },
        }),
      )

      this.cache.lastReportedChainlinkPegLevel = pegLevel
    }

    if (this.cache.lastReportedChainlinkPegTimestamp + HOURS_24 < blockDto.timestamp) {
      if (peg.right.toNumber() <= PEG_STEP_0_98) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 Super low stETH:ETH on Chainlink',
            description: `Current stETH:ETH on Chainlink - ${peg.right.toFixed(4)}, [source](${CHAINLINK_STETH_ETH_PAGE})`,
            alertId: 'LOW-STETH-CHAINLINK-PEG',
            severity: FindingSeverity.Critical,
            type: FindingType.Degraded,
            metadata: {
              peg: peg.right.toFixed(4),
            },
          }),
        )

        this.cache.lastReportedChainlinkPegTimestamp = blockDto.timestamp
      }
    }
    if (this.cache.lastReportedChainlinkPegLevel + PEG_STEP * 2 < pegLevel) {
      this.cache.lastReportedChainlinkPegLevel = pegLevel
    }

    return out
  }

  handleUnstakedStEth(blockDto: BlockDto): Finding[] {
    const out: Finding[] = []
    const newUnstakedStEth = this.calculateUnstakedStEth(this.cache.curveStEthBalance, this.cache.curveEthBalance)

    if (newUnstakedStEth.isGreaterThan(0)) {
      // if totalUnstakedStEth decreased by more than TOTAL_UNSTAKED_STETH_TOLERANCE% update last reported value
      if (newUnstakedStEth.isLessThan(this.cache.curveUnstakedStEth.times(1 - PERCENT_10 / 100))) {
        this.cache.curveUnstakedStEth = newUnstakedStEth
        this.cache.curveLastReportedUnstakedStEthTimestamp = blockDto.timestamp
      }

      if (newUnstakedStEth.isGreaterThanOrEqualTo(this.cache.curveUnstakedStEth.times(1 + PERCENT_10 / 100))) {
        if (newUnstakedStEth.isGreaterThanOrEqualTo(this.cache.curvePoolSize.times(PERCENT_10 / 100))) {
          const severity =
            blockDto.timestamp - this.cache.curveLastReportedUnstakedStEthTimestamp > ONE_HOUR
              ? FindingSeverity.Info
              : FindingSeverity.High
          const time = Math.floor((blockDto.timestamp - this.cache.curveLastReportedUnstakedStEthTimestamp) / ONE_HOUR)

          out.push(
            Finding.fromObject({
              name: "⚠️ Total 'unstaked' stETH increased",
              description:
                `Total unstaked stETH increased from ` +
                `${this.cache.curveUnstakedStEth.div(ETH_DECIMALS).toFixed(2)} stETH ` +
                `to ${newUnstakedStEth.div(ETH_DECIMALS).toFixed(2)} stETH ` +
                `over the last ${time} hours.\n` +
                `Note: Unstaked = difference of stETH(wstETH) and ETH amount in Curve and Balancer pools`,
              alertId: 'TOTAL-UNSTAKED-STETH-INCREASED',
              severity: severity,
              type: FindingType.Info,
              metadata: {
                prevTotalUnstaked: this.cache.curveUnstakedStEth.dividedBy(ETH_DECIMALS).toFixed(2),
                currentTotalUnstaked: newUnstakedStEth.dividedBy(ETH_DECIMALS).toFixed(2),
                timePeriod: time.toFixed(),
              },
            }),
          )
        }

        this.cache.curveUnstakedStEth = newUnstakedStEth
        this.cache.curveLastReportedUnstakedStEthTimestamp = blockDto.timestamp
      }
    }

    return out
  }

  private calcImbalance(balance1: BigNumber, balance2: BigNumber): number {
    const totalSize = balance1.plus(balance2)
    const percent1 = balance1.div(totalSize).times(100)
    const percent2 = balance2.div(totalSize).times(100)

    return percent1.minus(percent2).toNumber()
  }

  private curvePoolToString(v1: BigNumber, v2: BigNumber): string {
    const eth = v1.dividedBy(ETH_DECIMALS)
    const stEth = v2.dividedBy(ETH_DECIMALS)
    const totalSize = v1.plus(v2).dividedBy(ETH_DECIMALS)

    return (
      `ETH - ${eth.toFixed(2)} ` +
      `(${eth.div(totalSize).times(100).toFixed(2)}%)\n` +
      `stETH - ${stEth.toFixed(2)} ` +
      `(${stEth.div(totalSize).times(100).toFixed(2)}%)`
    )
  }

  private curvePoolImbalanceRapidlyChanges(curveImbalance: number): boolean {
    if (this.cache.lastReportedImbalance > 0 && curveImbalance > this.cache.lastReportedImbalance + PERCENT_10) {
      return true
    }

    if (this.cache.lastReportedImbalance < 0 && curveImbalance < this.cache.lastReportedImbalance - PERCENT_10) {
      return true
    }

    return false
  }

  private calcPoolSizeChange(balancePrev: BigNumber, balanceCur: BigNumber): number {
    return (balanceCur.div(balancePrev).toNumber() - 1) * 100
  }

  private calculateUnstakedStEth(stEthBalance: BigNumber, ethBalance: BigNumber): BigNumber {
    return stEthBalance.minus(ethBalance)
  }
}
