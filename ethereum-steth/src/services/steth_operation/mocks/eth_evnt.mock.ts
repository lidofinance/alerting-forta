import { TypedEvent } from '../../../generated/common'

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
