import { BlockTag } from '@ethersproject/providers'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'

export abstract class IEtherscanProvider {
  abstract getHistory(
    addressOrName: string | Promise<string>,
    startBlock?: BlockTag,
    endBlock?: BlockTag,
  ): Promise<Array<TransactionResponse>>

  abstract getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<EtherBigNumber>
}
