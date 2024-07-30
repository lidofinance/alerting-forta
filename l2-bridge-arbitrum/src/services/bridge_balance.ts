import { elapsed } from '../utils/time'
import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { ETH_DECIMALS } from '../utils/constants'
import { networkAlert } from '../utils/errors'
import { Finding } from '../generated/proto/alert_pb'
import { BlockDto } from '../entity/l2block'
import { chainL1, chainL2, ldo, Metrics, stETH, wStETH } from '../utils/metrics/metrics'

export abstract class IL1BridgeBalanceClient {
  abstract getWstEthBalance(blockTag: string | number): Promise<E.Either<Error, BigNumber>>

  abstract getLDOBalance(blockTag: string | number): Promise<E.Either<Error, BigNumber>>
}

export abstract class IL2BridgeBalanceClient {
  abstract getWstEthTotalSupply(blockTag: string | number): Promise<E.Either<Error, BigNumber>>

  abstract getLdoTotalSupply(blockTag: string | number): Promise<E.Either<Error, BigNumber>>
}

export class BridgeBalanceSrv {
  private name = `Bridge balance`
  private readonly logger: Logger
  private readonly clientL1: IL1BridgeBalanceClient
  private readonly clientL2: IL2BridgeBalanceClient
  private readonly networkName: string
  private readonly metrics: Metrics

  private _l1Ldo: BigNumber = new BigNumber(0)
  private _l1Steth: BigNumber = new BigNumber(0)
  private _l2Ldo: BigNumber = new BigNumber(0)
  private _l2wSteth: BigNumber = new BigNumber(0)

  constructor(
    logger: Logger,
    clientL1: IL1BridgeBalanceClient,
    clientL2: IL2BridgeBalanceClient,
    networkName: string,
    metrics: Metrics,
  ) {
    this.logger = logger
    this.clientL1 = clientL1
    this.clientL2 = clientL2
    this.networkName = networkName
    this.metrics = metrics
  }

  async handleBlock(l1Block: BlockDto, l2Blocks: BlockDto[]): Promise<Finding[]> {
    const start = new Date().getTime()
    this.logger.info(`\t${this.name} started: `, new Date(start).toUTCString())

    const promises = []
    this.logger.info(
      `\t\t#ETH:  ${l1Block.number} at ${new Date(l1Block.timestamp * 1000).toUTCString()}. ${l1Block.timestamp} `,
    )
    for (const l2Block of l2Blocks) {
      this.logger.info(
        `\t\t#ARB: ${l2Block.number} at ${new Date(l2Block.timestamp * 1000).toUTCString()}. ${l2Block.timestamp}`,
      )
      promises.push(this.handleBridgeBalanceWstETH(l1Block, l2Block), this.handleBridgeBalanceLDO(l1Block, l2Block))
    }

    const findings = (await Promise.all(promises)).flat()
    this.logger.info(`\t` + `${this.name} finished. Duration: ${elapsed(start)}\n`)
    return findings
  }

  private async handleBridgeBalanceWstETH(l1Block: BlockDto, l2BlockDto: BlockDto): Promise<Finding[]> {
    const [wstETHBalance_onL1Bridge, wstETHTotalSupply_onL2] = await Promise.all([
      this.clientL1.getWstEthBalance(l1Block.number),
      this.clientL2.getWstEthTotalSupply(l2BlockDto.hash),
    ])

    const out: Finding[] = []
    if (E.isRight(wstETHTotalSupply_onL2) && E.isRight(wstETHBalance_onL1Bridge)) {
      const l1 = wstETHBalance_onL1Bridge.right.dividedBy(ETH_DECIMALS).toFixed(2)
      const l2 = wstETHTotalSupply_onL2.right.dividedBy(ETH_DECIMALS).toFixed(2)

      this.logger.info(`\t\tWstETH balance: l1(${l1Block.number}) = ${l1}`)
      this.logger.info(`\t\tWstETH balance: l2(${l2BlockDto.number}) = ${l2}`)

      this._l1Steth = wstETHBalance_onL1Bridge.right
      this._l2wSteth = wstETHTotalSupply_onL2.right

      this.metrics.bridgeBalance
        .labels({
          token: stETH,
          chain: chainL1,
        })
        .set(wstETHBalance_onL1Bridge.right.dividedBy(ETH_DECIMALS).toNumber())
      this.metrics.bridgeBalance
        .labels({
          token: wStETH,
          chain: chainL2,
        })
        .set(wstETHTotalSupply_onL2.right.dividedBy(ETH_DECIMALS).toNumber())

      if (wstETHTotalSupply_onL2.right.isGreaterThan(wstETHBalance_onL1Bridge.right)) {
        const f = new Finding()

        f.setName(`🚨🚨🚨 ${this.networkName} bridge wstETH:stEth balance mismatch`)
        f.setDescription(
          `Total supply of bridged wstETH is greater than balanceOf L1 bridge side!\n` +
            `L2 total supply: ${l2}\n` +
            `L1 balanceOf: ${l1}\n\n` +
            `ETH: ${l1Block.number}\n` +
            `${this.networkName}: ${l2BlockDto.number}\n`,
        )
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setAlertid('OP-STETH-BRIDGE-BALANCE-MISMATCH')
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')
        f.setUniquekey((l1Block.number + l2BlockDto.number).toString())

        out.push(f)
      }
    } else {
      if (E.isLeft(wstETHBalance_onL1Bridge)) {
        this.logger.error('\t\t' + wstETHBalance_onL1Bridge.left.message)

        out.push(
          networkAlert(
            wstETHBalance_onL1Bridge.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:46`,
            `Could not call clientL1.getWstEthBalance`,
          ),
        )

        if (E.isLeft(wstETHTotalSupply_onL2)) {
          this.logger.error('\t\t' + wstETHTotalSupply_onL2.left.message)

          out.push(
            networkAlert(
              wstETHTotalSupply_onL2.left,
              `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:46`,
              `Could not call clientL2.getWstEthTotalSupply`,
            ),
          )
        }
      }
    }

    return out
  }

  private async handleBridgeBalanceLDO(l1Block: BlockDto, l2BlockDto: BlockDto): Promise<Finding[]> {
    const [ldoBalance_onL1Bridge, ldoTotalSupply_onL2] = await Promise.all([
      this.clientL1.getLDOBalance(l1Block.number),
      this.clientL2.getLdoTotalSupply(l2BlockDto.hash),
    ])

    const out: Finding[] = []

    if (E.isRight(ldoBalance_onL1Bridge) && E.isRight(ldoTotalSupply_onL2)) {
      const l1 = ldoBalance_onL1Bridge.right.dividedBy(ETH_DECIMALS).toFixed(2)
      const l2 = ldoTotalSupply_onL2.right.dividedBy(ETH_DECIMALS).toFixed(2)

      this.logger.info(`\t\tLdo balance: l1(${l1Block.number}) = ${l1}`)
      this.logger.info(`\t\tLdo balance: l2(${l2BlockDto.number}) = ${l2}`)

      this._l1Ldo = ldoBalance_onL1Bridge.right
      this._l2Ldo = ldoTotalSupply_onL2.right

      this.metrics.bridgeBalance
        .labels({
          token: ldo,
          chain: chainL1,
        })
        .set(ldoBalance_onL1Bridge.right.dividedBy(ETH_DECIMALS).toNumber())
      this.metrics.bridgeBalance
        .labels({
          token: ldo,
          chain: chainL2,
        })
        .set(ldoTotalSupply_onL2.right.dividedBy(ETH_DECIMALS).toNumber())

      if (ldoTotalSupply_onL2.right.isGreaterThan(ldoBalance_onL1Bridge.right)) {
        const f = new Finding()

        f.setName(`🚨🚨🚨 ${this.networkName} bridge LDO balance mismatch`)
        f.setDescription(
          `Total supply of bridged LDO is greater than balanceOf L1 bridge side!\n` +
            `L2 total supply: ${l1}\n` +
            `L1 balanceOf: ${l2}\n\n` +
            `ETH: ${l1Block.number}\n` +
            `${this.networkName}: ${l2BlockDto.number}\n`,
        )
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setAlertid('OP-LDO-BRIDGE-BALANCE-MISMATCH')
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')
        f.setUniquekey((l1Block.number + l2BlockDto.number).toString())

        out.push(f)
      }
    } else {
      if (E.isLeft(ldoBalance_onL1Bridge)) {
        this.logger.error('\t\t' + ldoBalance_onL1Bridge.left.message)
        out.push(
          networkAlert(
            ldoBalance_onL1Bridge.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceLDO.name}:103`,
            `Could not call clientL1.getLDOBalance`,
          ),
        )

        if (E.isLeft(ldoTotalSupply_onL2)) {
          this.logger.error('\t\t' + ldoTotalSupply_onL2.left.message)
          out.push(
            networkAlert(
              ldoTotalSupply_onL2.left,
              `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceLDO.name}:102`,
              `Could not call clientL2.getLdoTotalSupply`,
            ),
          )
        }
      }
    }

    return out
  }

  get l1Ldo(): string {
    return this._l1Ldo.dividedBy(ETH_DECIMALS).toFixed(4)
  }

  get l1Steth(): string {
    return this._l1Steth.dividedBy(ETH_DECIMALS).toFixed(4)
  }

  get l2Ldo(): string {
    return this._l2Ldo.dividedBy(ETH_DECIMALS).toFixed(4)
  }

  get l2wSteth(): string {
    return this._l2wSteth.dividedBy(ETH_DECIMALS).toFixed(4)
  }
}
