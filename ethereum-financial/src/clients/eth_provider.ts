import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import BigNumber from 'bignumber.js'
import { NetworkError } from '../utils/errors'
import { IAaveClient } from '../services/aave/Aave.srv'
import { AstETH, ChainlinkAggregator, CurvePool, LidoDAO, StableDebtStETH, VariableDebtStETH } from '../generated'
import { Logger } from 'winston'
import { ETH_DECIMALS } from '../utils/constants'
import { IPoolBalanceClient } from '../services/pools-balances/pool-balance.srv'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class ETHProvider implements IAaveClient, IPoolBalanceClient {
  private jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly logger: Logger

  private readonly stethContract: LidoDAO
  private readonly astEthContract: AstETH
  private readonly stableDebtStETHContract: StableDebtStETH
  private readonly variableDebtStETHContract: VariableDebtStETH
  private readonly curvePoolContract: CurvePool
  private readonly chainlinkAggregatorContract: ChainlinkAggregator

  constructor(
    logger: Logger,
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    stethContract: LidoDAO,
    astEthContract: AstETH,
    stableDebtStETHContract: StableDebtStETH,
    variableDebtStETHContract: VariableDebtStETH,
    curvePoolContract: CurvePool,
    chainlinkAggregatorContract: ChainlinkAggregator,
  ) {
    this.logger = logger
    this.jsonRpcProvider = jsonRpcProvider
    this.stethContract = stethContract
    this.astEthContract = astEthContract
    this.stableDebtStETHContract = stableDebtStETHContract
    this.variableDebtStETHContract = variableDebtStETHContract
    this.curvePoolContract = curvePoolContract
    this.chainlinkAggregatorContract = chainlinkAggregatorContract
  }

  public async getLatestBlock(): Promise<E.Either<Error, ethers.providers.Block>> {
    try {
      const latestBlockNumber = await this.jsonRpcProvider.getBlock('latest')
      return E.right(latestBlockNumber)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch latest block number`))
    }
  }

  public async getTotalSupply(blockHash: string): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [totalSupply] = await this.astEthContract.functions.totalSupply({
            blockTag: blockHash,
          })

          return totalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch aave totalSupply`))
    }
  }

  public async getStethBalance(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [balanceOf] = await this.stethContract.functions.balanceOf(address, {
            blockTag: blockHash,
          })

          return balanceOf
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch aSteth balance`))
    }
  }

  public async getStableDebtStEthTotalSupply(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [totalSupply] = await this.stableDebtStETHContract.functions.totalSupply({
            blockTag: blockNumber,
          })

          return totalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch stableDebtStETHContract.totalSupply`))
    }
  }

  public async getVariableDebtStEthTotalSupply(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [totalSupply] = await this.variableDebtStETHContract.functions.totalSupply({
            blockTag: blockNumber,
          })

          return totalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch variableDebtStETHContract.totalSupply`))
    }
  }

  public async getCurveEthBalance(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [ethBalance] = await this.curvePoolContract.functions.balances(0, {
            blockTag: blockNumber,
          })

          return ethBalance
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch curvePool eth balance`))
    }
  }

  public async getCurveStEthBalance(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [stethBalance] = await this.curvePoolContract.functions.balances(1, {
            blockTag: blockNumber,
          })

          return stethBalance
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch curvePool steth balance`))
    }
  }

  public async getCurveStEthToEthPrice(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const amountStEth = new BigNumber(1000).times(ETH_DECIMALS)

      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [amountEth] = await this.curvePoolContract.functions.get_dy(1, 0, amountStEth.toFixed(), {
            blockTag: blockNumber,
          })

          return amountEth
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(out.toString()).div(amountStEth))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch curvePoolContract.get_dy`))
    }
  }

  public async getChainlinkStEthToEthPrice(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const hexValue = await retryAsync<string>(
        async (): Promise<string> => {
          const [peg] = await this.chainlinkAggregatorContract.functions.latestAnswer({
            blockTag: blockNumber,
          })

          return peg.toHexString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(hexValue).dividedBy(ETH_DECIMALS))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch chainlinkAggregatorContract.latestAnswer`))
    }
  }
}
