import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { getUniqueKey, networkAlert } from '../utils/finding.helpers'
import { ETH_DECIMALS } from '../utils/constants'

export abstract class IL1BridgeBalanceClient {
  abstract getWstEthBalance(l1blockNumber: number, address: string): Promise<E.Either<Error, BigNumber>>
}

export abstract class IL2BridgeBalanceClient {
  abstract getWstEthTotalSupply(l1blockNumber: number): Promise<E.Either<Error, BigNumber>>
}

export class BridgeBalanceSrv {
  private name = `BridgeBalanceSrv`
  private readonly logger: Logger
  private readonly clientL1: IL1BridgeBalanceClient
  private readonly clientL2: IL2BridgeBalanceClient

  private readonly lineaL1TokenBridge: string

  constructor(
    logger: Logger,
    clientL1: IL1BridgeBalanceClient,
    lineaL1TokenBridge: string,
    clientL2: IL2BridgeBalanceClient,
  ) {
    this.logger = logger
    this.clientL1 = clientL1
    this.clientL2 = clientL2
    this.lineaL1TokenBridge = lineaL1TokenBridge
  }

  async handleBlock(l1BlockNumber: number, l2BlockNumbers: number[]): Promise<Finding[]> {
    const start = new Date().getTime()

    const findings = await this.handleBridgeBalanceWstETH(l1BlockNumber, l2BlockNumbers)

    this.logger.info(elapsedTime(this.name + '.' + this.handleBlock.name, start))
    return findings
  }

  private async handleBridgeBalanceWstETH(l1BlockNumber: number, l2BlockNumbers: number[]): Promise<Finding[]> {
    const wstETHBalance_onL1LineaBridge = await this.clientL1.getWstEthBalance(l1BlockNumber, this.lineaL1TokenBridge)

    const out: Finding[] = []
    if (E.isLeft(wstETHBalance_onL1LineaBridge)) {
      return [
        networkAlert(
          wstETHBalance_onL1LineaBridge.left,
          `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:36`,
          `Could not call clientL1.getWstEth`,
          l1BlockNumber,
        ),
      ]
    }

    for (const l2blockNumber of l2BlockNumbers) {
      const wstETHTotalSupply_onLinea = await this.clientL2.getWstEthTotalSupply(l2blockNumber)

      if (E.isLeft(wstETHTotalSupply_onLinea)) {
        out.push(
          networkAlert(
            wstETHTotalSupply_onLinea.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:36`,
            `Could not call clientL2.getWstEth`,
            l2blockNumber,
          ),
        )

        continue
      }

      if (wstETHTotalSupply_onLinea.right.isGreaterThan(wstETHBalance_onL1LineaBridge.right)) {
        out.push(
          Finding.fromObject({
            name: `🚨🚨🚨 Linea bridge balance mismatch 🚨🚨🚨`,
            description:
              `Total supply of bridged wstETH is greater than balanceOf L1 bridge side!\n` +
              `L2 total supply: ${wstETHTotalSupply_onLinea.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n` +
              `L1 balanceOf: ${wstETHBalance_onL1LineaBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n\n` +
              `ETH: ${l1BlockNumber}\n` +
              `Linea: ${l2blockNumber}\n`,
            alertId: 'BRIDGE-BALANCE-MISMATCH',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
            uniqueKey: getUniqueKey('032138b3-e581-4179-be4a-d92ca5763032', l1BlockNumber + l2blockNumber),
          }),
        )
      }
    }

    return out
  }
}
