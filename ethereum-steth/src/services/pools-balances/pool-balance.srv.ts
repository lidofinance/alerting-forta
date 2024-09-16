import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { BlockDto } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { ETH_DECIMALS } from '../../utils/constants'
import { networkAlert, NetworkError } from '../../utils/errors'
import { elapsedTime } from '../../utils/time'
import { PoolBalanceCache } from './pool-balance.cache'

//  MIN_5 Math.ceil((5 * 60) / 12) = 25
//  5 minutes in eth blocks
const MIN_5 = 25
const PERCENT_10 = 10
const PERCENT_5 = 5

const PRICE_CHANGE_STEP = 0.005
const PRICE_CHANGE_0_995 = 0.995
const PRICE_CHANGE_0_98 = 0.98

export const WEEK_1 = 60 * 60 * 24 * 7 // 1 week
const MINUTES_10 = 60 * 10

const CHAINLINK_STETH_ETH_PAGE = 'https://data.chain.link/ethereum/mainnet/crypto-eth/steth-eth'

export interface IPoolBalanceClient {
  getCurveEthBalance(blockTag: number | string): Promise<E.Either<Error, BigNumber>>

  getCurveStEthBalance(blockTag: number | string): Promise<E.Either<Error, BigNumber>>

  getCurveStEthToEthPrice(blockTag: number | string): Promise<E.Either<Error, BigNumber>>

  getChainlinkStEthToEthPrice(blockTag: number | string): Promise<E.Either<Error, BigNumber>>
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

    const [ethBalance, stEthBalance, ethBalancePrev, stEthBalancePrev, curveStEthToEthPrice, chainlinkStEthToEthPrice] =
      await Promise.all([
        this.ethClient.getCurveEthBalance(blockDto.number),
        this.ethClient.getCurveStEthBalance(blockDto.number),

        this.ethClient.getCurveEthBalance(blockDto.number - MIN_5),
        this.ethClient.getCurveStEthBalance(blockDto.number - MIN_5),

        this.ethClient.getCurveStEthToEthPrice(blockDto.number),
        this.ethClient.getChainlinkStEthToEthPrice(blockDto.number),
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

    if (E.isLeft(curveStEthToEthPrice)) {
      return curveStEthToEthPrice.left
    }

    if (E.isLeft(chainlinkStEthToEthPrice)) {
      return chainlinkStEthToEthPrice.left
    }

    this.cache.curveEthBalance = ethBalance.right
    this.cache.curveStEthBalance = stEthBalance.right
    this.cache.curvePoolSize = this.cache.curveEthBalance.plus(this.cache.curveStEthBalance)

    this.cache.lastReportedCurveImbalance = this.calcImbalance(ethBalancePrev.right, stEthBalancePrev.right)
    this.cache.lastReportedCurveImbalanceTimestamp = blockDto.timestamp

    this.cache.lastReportedCurveStEthToEthPrice = curveStEthToEthPrice.right.toNumber()
    this.cache.lastReportedCurvePriceChangeLevel =
      Math.ceil(curveStEthToEthPrice.right.toNumber() / PRICE_CHANGE_STEP) / 100
    this.cache.lastReportedCurveStEthToEthPriceTimestamp = blockDto.timestamp

    this.cache.lastReportedChainlinkStEthToEthPrice = chainlinkStEthToEthPrice.right.toNumber()
    this.cache.lastReportedChainlinkPriceChangeLevel =
      Math.ceil(chainlinkStEthToEthPrice.right.toNumber() / PRICE_CHANGE_STEP) / 100
    this.cache.lastReportedChainlinkStEthToEthPriceTimestamp = blockDto.timestamp

    this.logger.info(elapsedTime(PoolBalanceSrv.name + '.' + this.init.name, start))

    return null
  }

  async handleBlock(blockEvent: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [curvePoolImbalanceFindings, curvePegFindings, chainlinkPegFindings] = await Promise.all([
      this.handleCurvePool(blockEvent),
      this.handleCurvePriceChange(blockEvent),
      this.handleChainlinkPriceChange(blockEvent),
    ])

    findings.push(...curvePoolImbalanceFindings, ...curvePegFindings, ...chainlinkPegFindings)

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

    if (this.cache.lastReportedCurveImbalanceTimestamp + WEEK_1 < blockEvent.timestamp) {
      if (curveImbalance < -PERCENT_10 || curveImbalance > PERCENT_10) {
        const f: Finding = new Finding()

        f.setName('⚠️ Curve Pool is imbalanced')
        f.setDescription(`Current pool state:\n` + this.curvePoolToString(ethBalance.right, stEthBalance.right))
        f.setAlertid('CURVE-POOL-IMBALANCE')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        out.push(f)

        this.cache.lastReportedCurveImbalanceTimestamp = blockEvent.timestamp
        this.cache.lastReportedCurveImbalance = curveImbalance
      }
    }

    if (this.curvePoolImbalanceRapidlyChanges(curveImbalance)) {
      const f: Finding = new Finding()

      f.setName('🚨 Curve Pool rapid imbalance change')
      f.setDescription(
        `Prev reported pool sate:\n` +
          this.curvePoolToString(this.cache.curveEthBalance, this.cache.curveStEthBalance) +
          '\n' +
          `Current pool state:\n` +
          this.curvePoolToString(ethBalance.right, stEthBalance.right),
      )
      f.setAlertid('CURVE-POOL-IMBALANCE-RAPID-CHANGE')
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.SUSPICIOUS)
      f.setProtocol('ethereum')

      out.push(f)

      this.cache.lastReportedCurveImbalanceTimestamp = blockEvent.timestamp
      this.cache.lastReportedCurveImbalance = curveImbalance
    }

    const poolSize = ethBalance.right.plus(stEthBalance.right)
    const poolSizeChange = this.calcPoolSizeChange(poolSize, this.cache.curvePoolSize)

    if (Math.abs(poolSizeChange) > PERCENT_5) {
      let severity = Finding.Severity.MEDIUM
      let name = '⚠️ Significant Curve Pool size change'

      if (poolSizeChange < -PERCENT_10 || poolSizeChange > PERCENT_10) {
        severity = Finding.Severity.HIGH
        name = '🚨 Significant Curve Pool size change'
      }

      const f: Finding = new Finding()

      f.setName(name)
      f.setDescription(
        `Curve Pool size has ${
          poolSizeChange > 0
            ? 'increased by ' + poolSizeChange.toFixed(2).toString()
            : 'decreased by ' + -poolSizeChange.toFixed(2).toString()
        }% since the last block`,
      )
      f.setAlertid('CURVE-POOL-SIZE-CHANGE')
      f.setSeverity(severity)
      f.setType(Finding.FindingType.SUSPICIOUS)
      f.setProtocol('ethereum')

      const map = f.getMetadataMap()
      map.set('sizeBefore', this.cache.curvePoolSize.dividedBy(ETH_DECIMALS).toFixed())
      map.set('sizeAfter', poolSize.dividedBy(ETH_DECIMALS).toFixed())

      out.push(f)
    }

    this.cache.curvePoolSize = poolSize
    this.cache.curveEthBalance = ethBalance.right
    this.cache.curveStEthBalance = stEthBalance.right

    return out
  }

  async handleCurvePriceChange(blockDto: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []
    const curveStEthToEthPrice = await this.ethClient.getCurveStEthToEthPrice(blockDto.number)
    if (E.isLeft(curveStEthToEthPrice)) {
      return [
        networkAlert(
          curveStEthToEthPrice.left,
          `Error in ${PoolBalanceSrv.name}.${this.handleCurvePriceChange.name}:224`,
          `Could not call ethProvider.getCurveEthBalance`,
        ),
      ]
    }

    // Division by 100 is required to normalize pegLevel to PEG_STEP
    const priceChangeLevel = Math.ceil(curveStEthToEthPrice.right.toNumber() / PRICE_CHANGE_STEP) / 100
    // info on price decrease
    if (
      priceChangeLevel < this.cache.lastReportedCurveStEthToEthPrice &&
      curveStEthToEthPrice.right.toNumber() < PRICE_CHANGE_0_995
    ) {
      const f: Finding = new Finding()

      f.setName('⚠️ stETH:ETH price on Curve decreased')
      f.setDescription(`stETH:ETH price on Curve decreased to ${curveStEthToEthPrice.right.toFixed(4)}`)
      f.setAlertid('STETH-CURVE-PRICE-DECREASE')
      f.setSeverity(Finding.Severity.MEDIUM)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      out.push(f)

      this.cache.lastReportedCurveStEthToEthPrice = curveStEthToEthPrice.right.toNumber()
      this.cache.lastReportedCurvePriceChangeLevel = priceChangeLevel
      this.cache.lastReportedCurveStEthToEthPriceTimestamp = blockDto.timestamp
    }

    if (this.cache.lastReportedCurveStEthToEthPriceTimestamp + MINUTES_10 < blockDto.timestamp) {
      if (curveStEthToEthPrice.right.toNumber() <= PRICE_CHANGE_0_98) {
        const f: Finding = new Finding()

        f.setName('🚨Super low stETH:ETH price on Curve')
        f.setDescription(`Current stETH:ETH price on Curve - ${curveStEthToEthPrice.right.toFixed(4)}`)
        f.setAlertid('STETH-CURVE-PRICE-DECREASE')
        f.setSeverity(Finding.Severity.HIGH)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)

        this.cache.lastReportedCurveStEthToEthPrice = curveStEthToEthPrice.right.toNumber()
        this.cache.lastReportedCurvePriceChangeLevel = priceChangeLevel
        this.cache.lastReportedCurveStEthToEthPriceTimestamp = blockDto.timestamp
      }
    }

    if (this.cache.lastReportedCurvePriceChangeLevel + PRICE_CHANGE_STEP * 2 < priceChangeLevel) {
      this.cache.lastReportedCurveStEthToEthPrice = curveStEthToEthPrice.right.toNumber()
      this.cache.lastReportedCurvePriceChangeLevel = priceChangeLevel
      this.cache.lastReportedCurveStEthToEthPriceTimestamp = blockDto.timestamp
    }

    return out
  }

  async handleChainlinkPriceChange(blockDto: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []

    const chainlinkStEthToEthPrice = await this.ethClient.getChainlinkStEthToEthPrice(blockDto.number)
    if (E.isLeft(chainlinkStEthToEthPrice)) {
      return [
        networkAlert(
          chainlinkStEthToEthPrice.left,
          `Error in ${PoolBalanceSrv.name}.${this.handleChainlinkPriceChange.name}:296`,
          `Could not call ethProvider.getChainlinkPeg`,
        ),
      ]
    }

    // Division by 100 is required to normalize pegLevel to PEG_STEP
    const priceChangeLevel = Math.ceil(chainlinkStEthToEthPrice.right.toNumber() / PRICE_CHANGE_STEP) / 100
    // info on price decrease
    if (
      priceChangeLevel < this.cache.lastReportedChainlinkPriceChangeLevel &&
      chainlinkStEthToEthPrice.right.toNumber() < PRICE_CHANGE_0_995
    ) {
      const f: Finding = new Finding()

      f.setName('⚠️ stETH:ETH price on Chainlink decreased')
      f.setDescription(
        `stETH:ETH price on Chainlink decreased to ${chainlinkStEthToEthPrice.right.toFixed(4)}, [source](${CHAINLINK_STETH_ETH_PAGE})`,
      )
      f.setAlertid('STETH-CURVE-PRICE-DECREASE')
      f.setSeverity(Finding.Severity.MEDIUM)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      out.push(f)

      this.cache.lastReportedChainlinkStEthToEthPrice = chainlinkStEthToEthPrice.right.toNumber()
      this.cache.lastReportedChainlinkPriceChangeLevel = priceChangeLevel
      this.cache.lastReportedChainlinkStEthToEthPriceTimestamp = blockDto.timestamp
    }

    if (this.cache.lastReportedChainlinkStEthToEthPriceTimestamp + MINUTES_10 < blockDto.timestamp) {
      if (chainlinkStEthToEthPrice.right.toNumber() <= PRICE_CHANGE_0_98) {
        const f: Finding = new Finding()

        f.setName('🚨Super low stETH:ETH price on Chainlink')
        f.setDescription(
          `Current stETH:ETH price on Chainlink - ${chainlinkStEthToEthPrice.right.toFixed(4)}, [source](${CHAINLINK_STETH_ETH_PAGE})`,
        )
        f.setAlertid('LOW-STETH-CHAINLINK-PEG')
        f.setSeverity(Finding.Severity.HIGH)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)

        this.cache.lastReportedChainlinkStEthToEthPrice = chainlinkStEthToEthPrice.right.toNumber()
        this.cache.lastReportedChainlinkPriceChangeLevel = priceChangeLevel
        this.cache.lastReportedChainlinkStEthToEthPriceTimestamp = blockDto.timestamp
      }
    }
    if (this.cache.lastReportedChainlinkPriceChangeLevel + PRICE_CHANGE_STEP * 2 < priceChangeLevel) {
      this.cache.lastReportedChainlinkStEthToEthPrice = chainlinkStEthToEthPrice.right.toNumber()
      this.cache.lastReportedChainlinkPriceChangeLevel = priceChangeLevel
      this.cache.lastReportedChainlinkStEthToEthPriceTimestamp = blockDto.timestamp
    }

    return out
  }

  public calcImbalance(balance1: BigNumber, balance2: BigNumber): number {
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
    if (
      this.cache.lastReportedCurveImbalance > 0 &&
      curveImbalance > this.cache.lastReportedCurveImbalance + PERCENT_10
    ) {
      return true
    }

    if (
      this.cache.lastReportedCurveImbalance < 0 &&
      curveImbalance < this.cache.lastReportedCurveImbalance - PERCENT_10
    ) {
      return true
    }

    return false
  }

  private calcPoolSizeChange(balancePrev: BigNumber, balanceCur: BigNumber): number {
    return (balanceCur.div(balancePrev).toNumber() - 1) * 100
  }

  public getPoolInfo(): string {
    let line: string = '\nPool balance info:\n'
    line +=
      `\tCurve:\n` +
      `\t\tEthBalance: ${this.cache.curveEthBalance.div(ETH_DECIMALS).toFixed(4)}\n` +
      `\t\tStEthBalance: ${this.cache.curveStEthBalance.div(ETH_DECIMALS).toFixed(4)}\n` +
      `\t\tPoolSize: ${this.cache.curvePoolSize.div(ETH_DECIMALS).toFixed(4)}\n` +
      `\t\tStEth:Eth: ${this.cache.lastReportedCurveStEthToEthPrice.toFixed(4)}\n` +
      `\t\tImbalance: ${this.calcImbalance(this.cache.curveEthBalance, this.cache.curveStEthBalance).toFixed(4)}%\n\n` +
      `\tChainlink\n` +
      `\t\tStEth:Eth: ${this.cache.lastReportedChainlinkStEthToEthPrice.toString()}`

    return line
  }
}
