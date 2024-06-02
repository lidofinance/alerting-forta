// TODO: this is just a copy of the pool-balance.srv.ts file from ethereum-financial bot
import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { PoolBalanceCache } from './VaultWatcher.cache'
import { NetworkError, networkAlert } from 'src/shared/errors'
import { elapsedTime } from 'src/shared/time'
import { ETH_DECIMALS } from 'src/shared/constants'

//  MIN_5 Math.ceil((5 * 60) / 12) = 25
//  5 minutes in eth blocks
const MIN_5 = 25
const PERCENT_10 = 10
const PERCENT_5 = 5

const PRICE_CHANGE_STEP = 0.005
const PRICE_CHANGE_0_995 = 0.995
const PRICE_CHANGE_0_98 = 0.98

const WEEK_1 = 60 * 60 * 24 * 7 // 1 week
const MINUTES_10 = 60 * 10

const CHAINLINK_STETH_ETH_PAGE = 'https://data.chain.link/ethereum/mainnet/crypto-eth/steth-eth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VaultWatcherClient = any // TODO
// export interface IPoolBalanceClient {
//   getCurveEthBalance(blockNumber: number): Promise<E.Either<Error, BigNumber>>

//   getCurveStEthBalance(blockNumber: number): Promise<E.Either<Error, BigNumber>>

//   getCurveStEthToEthPrice(blockNumber: number): Promise<E.Either<Error, BigNumber>>

//   getChainlinkStEthToEthPrice(blockNumber: number): Promise<E.Either<Error, BigNumber>>
// }

export class VaultWatcherSrv {
  private readonly logger: Logger
  private readonly ethClient: VaultWatcherClient
  private readonly cache: PoolBalanceCache
  private readonly name = 'VaultWatcherSrv'

  constructor(logger: Logger, ethClient: VaultWatcherClient, cache: PoolBalanceCache) {
    this.logger = logger
    this.ethClient = ethClient
    this.cache = cache
  }

  async initialize(blockNumber: number, blockTimestamp: number): Promise<NetworkError | null> {
    const start = new Date().getTime()

    const [ethBalance, stEthBalance, ethBalancePrev, stEthBalancePrev, curveStEthToEthPrice, chainlinkStEthToEthPrice] =
      await Promise.all([
        this.ethClient.getCurveEthBalance(blockNumber),
        this.ethClient.getCurveStEthBalance(blockNumber),

        this.ethClient.getCurveEthBalance(blockNumber - MIN_5),
        this.ethClient.getCurveStEthBalance(blockNumber - MIN_5),

        this.ethClient.getCurveStEthToEthPrice(blockNumber),
        this.ethClient.getChainlinkStEthToEthPrice(blockNumber),
      ])

    // if (E.isLeft(ethBalance)) {
    //   return ethBalance.left
    // }

    // if (E.isLeft(stEthBalance)) {
    //   return stEthBalance.left
    // }

    // if (E.isLeft(ethBalancePrev)) {
    //   return ethBalancePrev.left
    // }

    // if (E.isLeft(stEthBalancePrev)) {
    //   return stEthBalancePrev.left
    // }

    // if (E.isLeft(curveStEthToEthPrice)) {
    //   return curveStEthToEthPrice.left
    // }

    // if (E.isLeft(chainlinkStEthToEthPrice)) {
    //   return chainlinkStEthToEthPrice.left
    // }

    this.cache.curveEthBalance = ethBalance.right
    this.cache.curveStEthBalance = stEthBalance.right
    this.cache.curvePoolSize = this.cache.curveEthBalance.plus(this.cache.curveStEthBalance)

    this.cache.lastReportedCurveImbalance = this.calcImbalance(ethBalancePrev.right, stEthBalancePrev.right)

    if (Math.abs(this.cache.lastReportedCurveImbalance) > PERCENT_10) {
      this.cache.lastReportedCurveImbalanceTimestamp = blockTimestamp
    }

    this.cache.lastReportedCurveStEthToEthPrice = curveStEthToEthPrice.right.toNumber()
    this.cache.lastReportedCurvePriceChangeLevel =
      Math.ceil(curveStEthToEthPrice.right.toNumber() / PRICE_CHANGE_STEP) / 100
    this.cache.lastReportedCurveStEthToEthPriceTimestamp = blockTimestamp

    this.cache.lastReportedChainlinkStEthToEthPrice = chainlinkStEthToEthPrice.right.toNumber()
    this.cache.lastReportedChainlinkPriceChangeLevel =
      Math.ceil(chainlinkStEthToEthPrice.right.toNumber() / PRICE_CHANGE_STEP) / 100
    this.cache.lastReportedChainlinkStEthToEthPriceTimestamp = blockTimestamp

    this.logger.info(elapsedTime(VaultWatcherSrv.name + '.' + this.initialize.name, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [curvePoolImbalanceFindings, curvePegFindings, chainlinkPegFindings] = await Promise.all([
      this.handleCurvePool(blockEvent),
      this.handleCurvePriceChange(blockEvent),
      this.handleChainlinkPriceChange(blockEvent),
    ])

    findings.push(...curvePoolImbalanceFindings, ...curvePegFindings, ...chainlinkPegFindings)

    this.logger.info(elapsedTime(VaultWatcherSrv.name + '.' + this.handleBlock.name, start))
    return findings
  }

  private async handleCurvePool(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []
    const [ethBalance, stEthBalance] = await Promise.all([
      this.ethClient.getCurveEthBalance(blockEvent.blockNumber),
      this.ethClient.getCurveStEthBalance(blockEvent.blockNumber),
    ])

    if (E.isLeft(ethBalance)) {
      return [
        networkAlert(
          ethBalance.left as unknown as Error, // TODO
          `Error in ${VaultWatcherSrv.name}.${this.handleCurvePool.name}:112`,
          `Could not call ethProvider.getCurveEthBalance`,
        ),
      ]
    }

    if (E.isLeft(stEthBalance)) {
      return [
        networkAlert(
          stEthBalance.left as unknown as Error, // TODO
          `Error in ${VaultWatcherSrv.name}.${this.handleCurvePool.name}:112`,
          `Could not call ethProvider.getCurveStEthBalance`,
        ),
      ]
    }

    const curveImbalance = this.calcImbalance(ethBalance.right, stEthBalance.right)

    if (this.cache.lastReportedCurveImbalanceTimestamp + WEEK_1 < blockEvent.block.timestamp) {
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

        this.cache.lastReportedCurveImbalanceTimestamp = blockEvent.block.timestamp
        this.cache.lastReportedCurveImbalance = curveImbalance
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
      this.cache.lastReportedCurveImbalanceTimestamp = blockEvent.block.timestamp
      this.cache.lastReportedCurveImbalance = curveImbalance
    }

    const poolSize = ethBalance.right.plus(stEthBalance.right)
    const poolSizeChange = this.calcPoolSizeChange(poolSize, this.cache.curvePoolSize)

    if (Math.abs(poolSizeChange) > PERCENT_5) {
      let severity = FindingSeverity.Info
      let name = '⚠️ Significant Curve Pool size change'
      if (poolSizeChange < -PERCENT_10 || poolSizeChange > PERCENT_10) {
        severity = FindingSeverity.High
        name = '🚨 Significant Curve Pool size change'
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

  async handleCurvePriceChange(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []
    const curveStEthToEthPrice = await this.ethClient.getCurveStEthToEthPrice(blockEvent.blockNumber)
    if (E.isLeft(curveStEthToEthPrice)) {
      return [
        networkAlert(
          curveStEthToEthPrice.left as unknown as Error, // TODO
          `Error in ${VaultWatcherSrv.name}.${this.handleCurvePriceChange.name}:224`,
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
      out.push(
        Finding.fromObject({
          name: '⚠️ stETH:ETH price on Curve decreased',
          description: `stETH:ETH price on Curve decreased to ${curveStEthToEthPrice.right.toFixed(4)}`,
          alertId: 'STETH-CURVE-PRICE-DECREASE',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: {
            peg: curveStEthToEthPrice.right.toFixed(4),
          },
        }),
      )
      this.cache.lastReportedCurveStEthToEthPrice = curveStEthToEthPrice.right.toNumber()
      this.cache.lastReportedCurvePriceChangeLevel = priceChangeLevel
      this.cache.lastReportedCurveStEthToEthPriceTimestamp = blockEvent.block.timestamp
    }

    if (this.cache.lastReportedCurveStEthToEthPriceTimestamp + MINUTES_10 < blockEvent.block.timestamp) {
      if (curveStEthToEthPrice.right.toNumber() <= PRICE_CHANGE_0_98) {
        out.push(
          Finding.fromObject({
            name: '🚨Super low stETH:ETH price on Curve',
            description: `Current stETH:ETH price on Curve - ${curveStEthToEthPrice.right.toFixed(4)}`,
            alertId: 'LOW-STETH-PRICE',
            severity: FindingSeverity.High,
            type: FindingType.Degraded,
            metadata: {
              peg: curveStEthToEthPrice.right.toFixed(4),
            },
          }),
        )
        this.cache.lastReportedCurveStEthToEthPrice = curveStEthToEthPrice.right.toNumber()
        this.cache.lastReportedCurvePriceChangeLevel = priceChangeLevel
        this.cache.lastReportedCurveStEthToEthPriceTimestamp = blockEvent.block.timestamp
      }
    }

    if (this.cache.lastReportedCurvePriceChangeLevel + PRICE_CHANGE_STEP * 2 < priceChangeLevel) {
      this.cache.lastReportedCurveStEthToEthPrice = curveStEthToEthPrice.right.toNumber()
      this.cache.lastReportedCurvePriceChangeLevel = priceChangeLevel
      this.cache.lastReportedCurveStEthToEthPriceTimestamp = blockEvent.block.timestamp
    }

    return out
  }

  async handleChainlinkPriceChange(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []

    const chainlinkStEthToEthPrice = await this.ethClient.getChainlinkStEthToEthPrice(blockEvent.blockNumber)
    if (E.isLeft(chainlinkStEthToEthPrice)) {
      return [
        networkAlert(
          chainlinkStEthToEthPrice.left as unknown as Error, // TODO
          `Error in ${VaultWatcherSrv.name}.${this.handleChainlinkPriceChange.name}:296`,
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
      out.push(
        Finding.fromObject({
          name: '⚠️ stETH:ETH price on Chainlink decreased',
          description: `stETH:ETH price on Chainlink decreased to ${chainlinkStEthToEthPrice.right.toFixed(4)}, [source](${CHAINLINK_STETH_ETH_PAGE})`,
          alertId: 'STETH-CHAINLINK-PRICE-DECREASE',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: {
            peg: chainlinkStEthToEthPrice.right.toFixed(4),
          },
        }),
      )

      this.cache.lastReportedChainlinkStEthToEthPrice = chainlinkStEthToEthPrice.right.toNumber()
      this.cache.lastReportedChainlinkPriceChangeLevel = priceChangeLevel
      this.cache.lastReportedChainlinkStEthToEthPriceTimestamp = blockEvent.block.timestamp
    }

    if (this.cache.lastReportedChainlinkStEthToEthPriceTimestamp + MINUTES_10 < blockEvent.block.timestamp) {
      if (chainlinkStEthToEthPrice.right.toNumber() <= PRICE_CHANGE_0_98) {
        out.push(
          Finding.fromObject({
            name: '🚨Super low stETH:ETH price on Chainlink',
            description: `Current stETH:ETH price on Chainlink - ${chainlinkStEthToEthPrice.right.toFixed(4)}, [source](${CHAINLINK_STETH_ETH_PAGE})`,
            alertId: 'LOW-STETH-CHAINLINK-PEG',
            severity: FindingSeverity.High,
            type: FindingType.Degraded,
            metadata: {
              peg: chainlinkStEthToEthPrice.right.toFixed(4),
            },
          }),
        )

        this.cache.lastReportedChainlinkStEthToEthPrice = chainlinkStEthToEthPrice.right.toNumber()
        this.cache.lastReportedChainlinkPriceChangeLevel = priceChangeLevel
        this.cache.lastReportedChainlinkStEthToEthPriceTimestamp = blockEvent.block.timestamp
      }
    }
    if (this.cache.lastReportedChainlinkPriceChangeLevel + PRICE_CHANGE_STEP * 2 < priceChangeLevel) {
      this.cache.lastReportedChainlinkStEthToEthPrice = chainlinkStEthToEthPrice.right.toNumber()
      this.cache.lastReportedChainlinkPriceChangeLevel = priceChangeLevel
      this.cache.lastReportedChainlinkStEthToEthPriceTimestamp = blockEvent.block.timestamp
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
}
