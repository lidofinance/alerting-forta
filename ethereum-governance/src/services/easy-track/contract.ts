import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'

export type INodeOperatorInfo = {
  name: string
  totalSigningKeys: BigNumber
  stakingLimit: BigNumber
}

export abstract class IEasyTrackClient {
  public abstract getNOInfoByMotionData(callData: string): Promise<E.Either<Error, INodeOperatorInfo>>
  public abstract getTokenSymbol(address: string): Promise<E.Either<Error, string>>
}
