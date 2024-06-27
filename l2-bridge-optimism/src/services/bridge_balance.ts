import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { ETH_DECIMALS } from '../utils/constants'
import { networkAlert } from '../utils/errors'
import { Finding } from '../generated/proto/alert_pb'

export abstract class IL1BridgeBalanceClient {
  abstract getWstEthBalance(l1blockNumber: number, address: string): Promise<E.Either<Error, BigNumber>>
  abstract getLDOBalance(l1blockNumber: number, optimismL1LdoBridge: string): Promise<E.Either<Error, BigNumber>>
}

export abstract class IL2BridgeBalanceClient {
  abstract getWstEthTotalSupply(l1blockNumber: number): Promise<E.Either<Error, BigNumber>>
  abstract getLdoTotalSupply(l2blockNumber: number): Promise<E.Either<Error, BigNumber>>
}

export class BridgeBalanceSrv {
  private name = `BridgeBalanceSrv`
  private readonly logger: Logger
  private readonly clientL1: IL1BridgeBalanceClient
  private readonly clientL2: IL2BridgeBalanceClient

  private readonly optimismL1TokenBridge: string
  private readonly optimismL1LdoBridge: string

  constructor(
    logger: Logger,
    clientL1: IL1BridgeBalanceClient,
    optimismL1TokenBridge: string,
    optimismL1LdoBridge: string,
    clientL2: IL2BridgeBalanceClient,
  ) {
    this.logger = logger
    this.clientL1 = clientL1
    this.clientL2 = clientL2
    this.optimismL1TokenBridge = optimismL1TokenBridge
    this.optimismL1LdoBridge = optimismL1LdoBridge
  }

  async handleBlock(l1BlockNumber: number, l2BlockNumber: number): Promise<Finding[]> {
    const start = new Date().getTime()

    const out: Finding[] = []
    const [wStethFindings, ldoFindings] = await Promise.all([
      this.handleBridgeBalanceWstETH(l1BlockNumber, l2BlockNumber),
      this.handleBridgeBalanceLDO(l1BlockNumber, l2BlockNumber),
    ])

    out.push(...wStethFindings, ...ldoFindings)

    this.logger.info(elapsedTime(this.name + '.' + this.handleBlock.name, start))
    return out
  }

  private async handleBridgeBalanceWstETH(l1BlockNumber: number, l2BlockNumber: number): Promise<Finding[]> {
    const [wstETHBalance_onL1OptimismBridge, wstETHTotalSupply_onOptimism] = await Promise.all([
      this.clientL1.getWstEthBalance(l1BlockNumber, this.optimismL1TokenBridge),
      this.clientL2.getWstEthTotalSupply(l2BlockNumber),
    ])

    const out: Finding[] = []
    if (E.isRight(wstETHTotalSupply_onOptimism) && E.isRight(wstETHBalance_onL1OptimismBridge)) {
      if (wstETHTotalSupply_onOptimism.right.isGreaterThan(wstETHBalance_onL1OptimismBridge.right)) {
        const f = new Finding()

        f.setName(`🚨🚨🚨 Optimism bridge wstETH:stEth balance mismatch`)
        f.setDescription(
          `Total supply of bridged wstETH is greater than balanceOf L1 bridge side!\n` +
            `L2 total supply: ${wstETHTotalSupply_onOptimism.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n` +
            `L1 balanceOf: ${wstETHBalance_onL1OptimismBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n\n` +
            `ETH: ${l1BlockNumber}\n` +
            `Optimism: ${l2BlockNumber}\n`,
        )
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setAlertid('OP-STETH-BRIDGE-BALANCE-MISMATCH')
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('optimism')

        out.push(f)
      }
    } else {
      if (E.isLeft(wstETHBalance_onL1OptimismBridge)) {
        out.push(
          networkAlert(
            wstETHBalance_onL1OptimismBridge.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:46`,
            `Could not call clientL1.getWstEthBalance`,
          ),
        )

        if (E.isLeft(wstETHTotalSupply_onOptimism)) {
          out.push(
            networkAlert(
              wstETHTotalSupply_onOptimism.left,
              `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:46`,
              `Could not call clientL2.getWstEthTotalSupply`,
            ),
          )
        }
      }
    }

    return out
  }

  private async handleBridgeBalanceLDO(l1BlockNumber: number, l2BlockNumber: number): Promise<Finding[]> {
    const [ldoBalance_onL1OptimismBridge, ldoTotalSupply_onOptimism] = await Promise.all([
      this.clientL1.getLDOBalance(l1BlockNumber, this.optimismL1LdoBridge),
      this.clientL2.getLdoTotalSupply(l2BlockNumber),
    ])

    const out: Finding[] = []

    if (E.isRight(ldoBalance_onL1OptimismBridge) && E.isRight(ldoTotalSupply_onOptimism)) {
      if (ldoTotalSupply_onOptimism.right.isGreaterThan(ldoBalance_onL1OptimismBridge.right)) {
        const f = new Finding()

        f.setName(`🚨🚨🚨 Optimism bridge LDO balance mismatch`)
        f.setDescription(
          `Total supply of bridged LDO is greater than balanceOf L1 bridge side!\n` +
            `L2 total supply: ${ldoTotalSupply_onOptimism.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n` +
            `L1 balanceOf: ${ldoBalance_onL1OptimismBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n\n` +
            `ETH: ${l1BlockNumber}\n` +
            `Optimism: ${l2BlockNumber}\n`,
        )
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setAlertid('OP-LDO-BRIDGE-BALANCE-MISMATCH')
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('optimism')

        out.push(f)
      }
    } else {
      if (E.isLeft(ldoBalance_onL1OptimismBridge)) {
        out.push(
          networkAlert(
            ldoBalance_onL1OptimismBridge.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceLDO.name}:103`,
            `Could not call clientL1.getLDOBalance`,
          ),
        )

        if (E.isLeft(ldoTotalSupply_onOptimism)) {
          out.push(
            networkAlert(
              ldoTotalSupply_onOptimism.left,
              `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceLDO.name}:102`,
              `Could not call clientL2.getLdoTotalSupply`,
            ),
          )
        }
      }
    }

    return out
  }
}
