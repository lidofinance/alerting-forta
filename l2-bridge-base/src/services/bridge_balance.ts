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

  private readonly baseL1TokenBridge: string

  constructor(
    logger: Logger,
    clientL1: IL1BridgeBalanceClient,
    baseL1TokenBridge: string,
    clientL2: IL2BridgeBalanceClient,
  ) {
    this.logger = logger
    this.clientL1 = clientL1
    this.clientL2 = clientL2
    this.baseL1TokenBridge = baseL1TokenBridge
  }

  async handleBlock(l1BlockNumber: number, l2BlockNumbers: number[]): Promise<Finding[]> {
    const start = new Date().getTime()

    const findings = await this.handleBridgeBalanceWstETH(l1BlockNumber, l2BlockNumbers)

    this.logger.info(elapsedTime(this.name + '.' + this.handleBlock.name, start))
    return findings
  }

  private async handleBridgeBalanceWstETH(l1BlockNumber: number, l2BlockNumbers: number[]): Promise<Finding[]> {
    const wstETHBalance_onL1BaseBridge = await this.clientL1.getWstEthBalance(l1BlockNumber, this.baseL1TokenBridge)

    const out: Finding[] = []
    if (E.isLeft(wstETHBalance_onL1BaseBridge)) {
      return [
        networkAlert(
          wstETHBalance_onL1BaseBridge.left,
          `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:36`,
          `Could not call clientL1.getWstEth`,
          l1BlockNumber,
        ),
      ]
    }

    for (const l2blockNumber of l2BlockNumbers) {
      const wstETHTotalSupply_onBase = await this.clientL2.getWstEthTotalSupply(l2blockNumber)

      if (E.isLeft(wstETHTotalSupply_onBase)) {
        out.push(
          networkAlert(
            wstETHTotalSupply_onBase.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:36`,
            `Could not call clientL2.getWstEth`,
            l2blockNumber,
          ),
        )

        continue
      }

      if (wstETHTotalSupply_onBase.right.isGreaterThan(wstETHBalance_onL1BaseBridge.right)) {
        out.push(
          Finding.fromObject({
            name: `🚨🚨🚨 Base bridge balance mismatch 🚨🚨🚨`,
            description:
              `Total supply of bridged wstETH is greater than balanceOf L1 bridge side!\n` +
              `L2 total supply: ${wstETHTotalSupply_onBase.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n` +
              `L1 balanceOf: ${wstETHBalance_onL1BaseBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n\n` +
              `ETH: ${l1BlockNumber}\n` +
              `Base: ${l2blockNumber}\n`,
            alertId: 'BRIDGE-BALANCE-MISMATCH',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
            uniqueKey: getUniqueKey('74c4c184-bc7f-4634-8043-b2a8c4f377cb', l1BlockNumber + l2blockNumber),
          }),
        )
      }
    }

    return out
  }
}
