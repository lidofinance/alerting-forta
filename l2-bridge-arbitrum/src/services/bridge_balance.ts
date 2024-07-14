import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { ETH_DECIMALS } from '../utils/constants'
import { networkAlert } from '../utils/errors'
import { Finding } from '../generated/proto/alert_pb'

export abstract class IL1BridgeBalanceClient {
  abstract getWstEthBalance(l1blockNumber: number, address: string): Promise<E.Either<Error, BigNumber>>
  abstract getLDOBalance(l1blockNumber: number, arbitrumL1LdoBridge: string): Promise<E.Either<Error, BigNumber>>
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

  private readonly arbitrumL1TokenBridge: string
  private readonly arbitrumL1LdoBridge: string

  constructor(
    logger: Logger,
    clientL1: IL1BridgeBalanceClient,
    arbitrumL1TokenBridge: string,
    arbitrumL1LdoBridge: string,
    clientL2: IL2BridgeBalanceClient,
  ) {
    this.logger = logger
    this.clientL1 = clientL1
    this.clientL2 = clientL2
    this.arbitrumL1TokenBridge = arbitrumL1TokenBridge
    this.arbitrumL1LdoBridge = arbitrumL1LdoBridge
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
    const [wstETHBalance_onL1arbitrumBridge, wstETHTotalSupply_onarbitrum] = await Promise.all([
      this.clientL1.getWstEthBalance(l1BlockNumber, this.arbitrumL1TokenBridge),
      this.clientL2.getWstEthTotalSupply(l2BlockNumber),
    ])

    const out: Finding[] = []
    if (E.isRight(wstETHTotalSupply_onarbitrum) && E.isRight(wstETHBalance_onL1arbitrumBridge)) {
      if (wstETHTotalSupply_onarbitrum.right.isGreaterThan(wstETHBalance_onL1arbitrumBridge.right)) {
        const f = new Finding()

        f.setName(`🚨🚨🚨 Arbitrum bridge wstETH:stEth balance mismatch`)
        f.setDescription(
          `Total supply of bridged wstETH is greater than balanceOf L1 bridge side!\n` +
            `L2 total supply: ${wstETHTotalSupply_onarbitrum.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n` +
            `L1 balanceOf: ${wstETHBalance_onL1arbitrumBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n\n` +
            `ETH: ${l1BlockNumber}\n` +
            `arbitrum: ${l2BlockNumber}\n`,
        )
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setAlertid('OP-STETH-BRIDGE-BALANCE-MISMATCH')
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('arbitrum')

        out.push(f)
      }
    } else {
      if (E.isLeft(wstETHBalance_onL1arbitrumBridge)) {
        out.push(
          networkAlert(
            wstETHBalance_onL1arbitrumBridge.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:46`,
            `Could not call clientL1.getWstEthBalance`,
          ),
        )

        if (E.isLeft(wstETHTotalSupply_onarbitrum)) {
          out.push(
            networkAlert(
              wstETHTotalSupply_onarbitrum.left,
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
    const [ldoBalance_onL1arbitrumBridge, ldoTotalSupply_onarbitrum] = await Promise.all([
      this.clientL1.getLDOBalance(l1BlockNumber, this.arbitrumL1LdoBridge),
      this.clientL2.getLdoTotalSupply(l2BlockNumber),
    ])

    const out: Finding[] = []

    if (E.isRight(ldoBalance_onL1arbitrumBridge) && E.isRight(ldoTotalSupply_onarbitrum)) {
      if (ldoTotalSupply_onarbitrum.right.isGreaterThan(ldoBalance_onL1arbitrumBridge.right)) {
        const f = new Finding()

        f.setName(`🚨🚨🚨 Arbitrum bridge LDO balance mismatch`)
        f.setDescription(
          `Total supply of bridged LDO is greater than balanceOf L1 bridge side!\n` +
            `L2 total supply: ${ldoTotalSupply_onarbitrum.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n` +
            `L1 balanceOf: ${ldoBalance_onL1arbitrumBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n\n` +
            `ETH: ${l1BlockNumber}\n` +
            `arbitrum: ${l2BlockNumber}\n`,
        )
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setAlertid('OP-LDO-BRIDGE-BALANCE-MISMATCH')
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('arbitrum')

        out.push(f)
      }
    } else {
      if (E.isLeft(ldoBalance_onL1arbitrumBridge)) {
        out.push(
          networkAlert(
            ldoBalance_onL1arbitrumBridge.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceLDO.name}:103`,
            `Could not call clientL1.getLDOBalance`,
          ),
        )

        if (E.isLeft(ldoTotalSupply_onarbitrum)) {
          out.push(
            networkAlert(
              ldoTotalSupply_onarbitrum.left,
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
