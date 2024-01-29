import {
  LidoContract,
  TransactionEventContract,
  WithdrawalQueueContract,
} from '../../services/steth_operation/contracts'
import { TypedEvent } from '../../generated/common'
import { faker } from '@faker-js/faker'

export const LidoContractMock = (): jest.Mocked<LidoContract> => ({
  getDepositableEther: jest.fn(),
  queryFilter: jest.fn(),
  filters: {
    Unbuffered: () => {
      return {
        address: faker.finance.ethereumAddress(),
        topics: [faker.finance.ethereumAddress()],
      }
    },
  },
})

export const WithdrawalQueueContractMock = (): jest.Mocked<WithdrawalQueueContract> => ({
  queryFilter: jest.fn(),
  filters: {
    WithdrawalsFinalized: () => {
      return {
        address: faker.finance.ethereumAddress(),
        topics: [faker.finance.ethereumAddress()],
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

export const TransactionEventContractMock = (): jest.Mocked<TransactionEventContract> => ({
  addresses: {},
  logs: [],
  filterLog: jest.fn(),
  to: faker.finance.ethereumAddress(),
  timestamp: faker.date.past().getTime(),
})
