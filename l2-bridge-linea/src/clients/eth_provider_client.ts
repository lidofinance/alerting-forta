import { Logger } from 'winston'
import { IL1BridgeBalanceClient } from '../services/bridge_balance'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { NetworkError } from '../utils/error'
import { retryAsync } from 'ts-retry'
import { ERC20Short as wStEthRunner } from '../generated'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class ETHProvider implements IL1BridgeBalanceClient {
  private readonly wStEthRunner: wStEthRunner
  private readonly logger: Logger

  constructor(logger: Logger, wStEthRunner: wStEthRunner) {
    this.wStEthRunner = wStEthRunner
    this.logger = logger
  }

  public async getWstEth(l1blockNumber: number, address: string): Promise<E.Either<Error, BigNumber>> {
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
}
