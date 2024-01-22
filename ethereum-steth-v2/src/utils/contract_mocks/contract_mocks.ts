import { LidoContract, WithdrawalQueueContract } from '../../services/steth_operation/contracts'
import { TypedEvent } from '../../generated/common'

export const LidoContractMock = (): jest.Mocked<LidoContract> => ({
  getDepositableEther: jest.fn(),
  queryFilter: jest.fn(),
  filters: {
    Unbuffered: () => {
      return {
        address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        topics: ['0x76a397bea5768d4fca97ef47792796e35f98dc81b16c1de84e28a818e1f97108'],
      }
    },
  },
})

export const WithdrawalQueueContractMock = (): jest.Mocked<WithdrawalQueueContract> => ({
  queryFilter: jest.fn(),
  filters: {
    WithdrawalsFinalized: () => {
      return {
        address: '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1',
        topics: ['0x197874c72af6a06fb0aa4fab45fd39c7cb61ac0992159872dc3295207da7e9eb'],
      }
    },
  },
})

export const TypedEventMock = (): jest.Mocked<TypedEvent> => ({
  address: '',
  args: undefined,
  blockHash: '',
  blockNumber: 0,
  data: '',
  getBlock: jest.fn(),
  getTransaction: jest.fn(),
  getTransactionReceipt: jest.fn(),
  logIndex: 0,
  removeListener: jest.fn(),
  removed: false,
  topics: [],
  transactionHash: '',
  transactionIndex: 0,
})
