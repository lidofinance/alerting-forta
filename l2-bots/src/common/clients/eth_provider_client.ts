import { Logger } from 'winston'
import { ethers } from 'ethers'
// import { IL1BridgeBalanceClient } from '../services/bridge_balance'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { NetworkError } from '../utils/error'
import { retryAsync } from 'ts-retry'
import { ERC20Short as wStEthRunner } from '../generated'
import { BlockDto } from '../entity/blockDto'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class ETHProvider {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly wStEthRunner: wStEthRunner
  private readonly logger: Logger

  constructor(logger: Logger, wStEthRunner: wStEthRunner, jsonRpcProvider: ethers.providers.JsonRpcProvider) {
    this.wStEthRunner = wStEthRunner
    this.logger = logger
    this.jsonRpcProvider = jsonRpcProvider
  }

  public async getWstEthBalance(l1blockNumber: number, address: string): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.wStEthRunner.functions.balanceOf(address, {
            blockTag: l1blockNumber,
          })

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(out))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call wStEthRunner.functions.balanceOf`))
    }
  }

  public async getBlockByTag(tag: string): Promise<E.Either<Error, BlockDto>> {
    // TODO: restore metrics
    // const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getBlockByTag.name }).startTimer()
    try {
      const block = await this.jsonRpcProvider.getBlock(tag)

      // this.metrics.etherJsRequest.labels({ method: this.getBlockByTag.name, status: StatusOK }).inc()
      // end({ status: StatusOK })

      const l1Block = new BlockDto(
        block.hash,
        block.parentHash,
        new BigNumber(block.number, 10).toNumber(),
        new BigNumber(block.timestamp, 10).toNumber(),
      )

      return E.right(l1Block)
    } catch (e) {
      // this.metrics.etherJsRequest.labels({ method: this.getBlockByTag.name, status: StatusFail }).inc()
      // end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch l1block by tag ${tag}`))
    }
  }
}
