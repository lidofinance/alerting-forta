import * as E from 'fp-ts/Either'
import { BlockTag } from '@ethersproject/providers'
import BigNumber from 'bignumber.js'

export interface IVoteInfo {
  id: number
  startDate: number
  open: boolean
  yea: BigNumber
  nay: BigNumber
  votingPower: BigNumber
  supportRequired: number
  minAcceptQuorum: number
  phase: number
}
export abstract class IAragonVotingClient {
  public abstract getStartedVotes(
    fromBlockOrBlockhash: BlockTag,
    toBlock: BlockTag,
  ): Promise<E.Either<Error, Map<number, IVoteInfo>>>
  public abstract getVote(voteId: number, toBlock: BlockTag): Promise<E.Either<Error, IVoteInfo>>
}
