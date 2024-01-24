import type { BigNumber, BigNumberish, CallOverrides } from 'ethers'
import type { TypedEvent, TypedEventFilter } from '../../generated/common'
import { UnbufferedEventFilter } from '../../generated/Lido'
import { WithdrawalsFinalizedEventFilter } from '../../generated/WithdrawalQueueERC721'
import { Log, LogDescription } from 'forta-agent'

export interface LidoContract {
  getDepositableEther(overrides?: CallOverrides): Promise<BigNumber>

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TEvent>>

  filters: {
    Unbuffered(amount?: null): UnbufferedEventFilter
  }
}

export interface WithdrawalQueueContract {
  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TEvent>>

  filters: {
    WithdrawalsFinalized(
      from?: BigNumberish | null,
      to?: BigNumberish | null,
      amountOfETHLocked?: null,
      sharesToBurn?: null,
      timestamp?: null,
    ): WithdrawalsFinalizedEventFilter
  }
}

export type TransactionEventContract = {
  addresses: {
    [key: string]: boolean
  }
  logs: Log[]
  filterLog: (eventAbi: string | string[], contractAddress?: string | string[]) => LogDescription[]
  to: string | null
  timestamp: number
}
