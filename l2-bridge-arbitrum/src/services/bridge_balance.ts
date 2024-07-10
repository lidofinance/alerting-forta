import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { ETH_DECIMALS } from '../utils/constants'
import { networkAlert } from '../utils/errors'
import { Finding } from '../generated/proto/alert_pb'
import { BlockDto, BlockHash } from '../entity/blockDto'
import { LRUCache } from 'lru-cache'

export abstract class IL1BridgeBalanceClient {
  abstract getWstEthBalance(l1blockNumber: BlockHash): Promise<E.Either<Error, BigNumber>>
  abstract getLDOBalance(l1blockNumber: BlockHash): Promise<E.Either<Error, BigNumber>>
}

export abstract class IL2BridgeBalanceClient {
  abstract getWstEthTotalSupply(l2BlockHash: BlockHash): Promise<E.Either<Error, BigNumber>>
  abstract getLdoTotalSupply(l2BlockHash: BlockHash): Promise<E.Either<Error, BigNumber>>
}

export class BridgeBalanceSrv {
  private name = `BridgeBalanceSrv`
  private readonly logger: Logger
  private readonly clientL1: IL1BridgeBalanceClient
  private readonly clientL2: IL2BridgeBalanceClient
  private readonly processedKeyPairsCache: LRUCache<string, boolean>

  constructor(
    logger: Logger,
    clientL1: IL1BridgeBalanceClient,
    clientL2: IL2BridgeBalanceClient,
    processedKeyPairsCache: LRUCache<string, boolean>,
  ) {
    this.logger = logger
    this.clientL1 = clientL1
    this.clientL2 = clientL2
    this.processedKeyPairsCache = processedKeyPairsCache
  }

  async handleBlock(l1Block: BlockDto, l2Block: BlockDto): Promise<Finding[]> {
    const cacheKey = `${l1Block.number}.${l2Block.number}`
    if (this.processedKeyPairsCache.has(cacheKey)) {
      return []
    }

    const start = new Date().getTime()

    const out: Finding[] = []
    const [wStethFindings, ldoFindings] = await Promise.all([
      this.handleBridgeBalanceWstETH(l1Block, l2Block),
      this.handleBridgeBalanceLDO(l1Block, l2Block),
    ])

    out.push(...wStethFindings, ...ldoFindings)

    this.processedKeyPairsCache.set(cacheKey, true)
    this.logger.info(elapsedTime(this.name + '.' + this.handleBlock.name + `(${l2Block.number})`, start))
    return out
  }

  private async handleBridgeBalanceWstETH(l1Block: BlockDto, l2BlockDto: BlockDto): Promise<Finding[]> {
    const [wstETHBalance_onL1ArbitrumBridge, wstETHTotalSupply_onArbitrum] = await Promise.all([
      this.clientL1.getWstEthBalance(l1Block.hash),
      this.clientL2.getWstEthTotalSupply(l2BlockDto.hash),
    ])

    const out: Finding[] = []
    if (E.isRight(wstETHTotalSupply_onArbitrum) && E.isRight(wstETHBalance_onL1ArbitrumBridge)) {
      const l1 = wstETHBalance_onL1ArbitrumBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)
      const l2 = wstETHTotalSupply_onArbitrum.right.dividedBy(ETH_DECIMALS).toFixed(2)

      // TODO to think about prom metrics
      this.logger.info(`WstETH balance: l1(${l1Block.number}) = ${l1}`)
      this.logger.info(`WstETH balance: l2(${l2BlockDto.number}) = ${l2}`)

      if (wstETHTotalSupply_onArbitrum.right.isGreaterThan(wstETHBalance_onL1ArbitrumBridge.right)) {
        const f = new Finding()

        f.setName(`🚨🚨🚨 Arbitrum bridge wstETH:stEth balance mismatch`)
        f.setDescription(
          `Total supply of bridged wstETH is greater than balanceOf L1 bridge side!\n` +
            `L2 total supply: ${l2}\n` +
            `L1 balanceOf: ${l1}\n\n` +
            `ETH: ${l1Block.number}\n` +
            `Arbitrum: ${l2BlockDto.number}\n`,
        )
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setAlertid('OP-STETH-BRIDGE-BALANCE-MISMATCH')
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')
        f.setUniquekey((l1Block.number + l2BlockDto.number).toString())

        out.push(f)
      }
    } else {
      if (E.isLeft(wstETHBalance_onL1ArbitrumBridge)) {
        out.push(
          networkAlert(
            wstETHBalance_onL1ArbitrumBridge.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceWstETH.name}:46`,
            `Could not call clientL1.getWstEthBalance`,
          ),
        )

        if (E.isLeft(wstETHTotalSupply_onArbitrum)) {
          out.push(
            networkAlert(
              wstETHTotalSupply_onArbitrum.left,
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
    const [ldoBalance_onL1ArbitrumBridge, ldoTotalSupply_onArbitrum] = await Promise.all([
      this.clientL1.getLDOBalance(l1Block.hash),
      this.clientL2.getLdoTotalSupply(l2BlockDto.hash),
    ])

    const out: Finding[] = []

    if (E.isRight(ldoBalance_onL1ArbitrumBridge) && E.isRight(ldoTotalSupply_onArbitrum)) {
      const l1 = ldoBalance_onL1ArbitrumBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)
      const l2 = ldoTotalSupply_onArbitrum.right.dividedBy(ETH_DECIMALS).toFixed(2)

      // TODO to think about prom metrics
      this.logger.info(`Ldo balance: l1(${l1Block.number}) = ${l1}`)
      this.logger.info(`Ldo balance: l2(${l2BlockDto.number}) = ${l2}`)

      if (ldoTotalSupply_onArbitrum.right.isGreaterThan(ldoBalance_onL1ArbitrumBridge.right)) {
        const f = new Finding()

        f.setName(`🚨🚨🚨 Arbitrum bridge LDO balance mismatch`)
        f.setDescription(
          `Total supply of bridged LDO is greater than balanceOf L1 bridge side!\n` +
            `L2 total supply: ${ldoTotalSupply_onArbitrum.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n` +
            `L1 balanceOf: ${ldoBalance_onL1ArbitrumBridge.right.dividedBy(ETH_DECIMALS).toFixed(2)}\n\n` +
            `ETH: ${l1Block.number}\n` +
            `Arbitrum: ${l2BlockDto.number}\n`,
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
      if (E.isLeft(ldoBalance_onL1ArbitrumBridge)) {
        out.push(
          networkAlert(
            ldoBalance_onL1ArbitrumBridge.left,
            `Error in ${BridgeBalanceSrv.name}.${this.handleBridgeBalanceLDO.name}:103`,
            `Could not call clientL1.getLDOBalance`,
          ),
        )

        if (E.isLeft(ldoTotalSupply_onArbitrum)) {
          out.push(
            networkAlert(
              ldoTotalSupply_onArbitrum.left,
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
