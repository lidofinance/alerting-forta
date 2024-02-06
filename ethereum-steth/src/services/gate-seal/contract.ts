import * as E from 'fp-ts/Either'
import { GateSeal } from '../../entity/gate_seal'
import BigNumber from 'bignumber.js'

export abstract class IGateSealClient {
  public abstract checkGateSeal(blockNumber: number, gateSealAddress: string): Promise<E.Either<Error, GateSeal>>

  public abstract getExpiryTimestamp(blockNumber: number): Promise<E.Either<Error, BigNumber>>
}
