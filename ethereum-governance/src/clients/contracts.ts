import { BlockTag } from '@ethersproject/providers'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'

export abstract class IEtherscanProvider {
  abstract getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<EtherBigNumber>
}
