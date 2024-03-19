import { TypedEvent } from '../../../generated/smart-contracts/common'
import { faker } from '@faker-js/faker'
import { TransactionEventDto } from '../../../entity/events'

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

export const TransactionEventContractMock = (): jest.Mocked<TransactionEventDto> => ({
  addresses: {},
  logs: [],
  filterLog: jest.fn(),
  to: faker.finance.ethereumAddress(),
  timestamp: faker.date.past().getTime(),
})
