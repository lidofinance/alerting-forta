// Define a factory function to create mock instances
import { IETHProvider } from '../eth_provider'

export const ETHProviderMock = (): jest.Mocked<IETHProvider> => ({
  getTransaction: jest.fn(),
  getStartedBlockForApp: jest.fn(),
  getHistory: jest.fn(),
  getStethBalance: jest.fn(),
  getBalance: jest.fn(),
  getBalanceByBlockHash: jest.fn(),
  getStakingLimitInfo: jest.fn(),
  getUnfinalizedStETH: jest.fn(),
  getWithdrawalStatuses: jest.fn(),
  getBufferedEther: jest.fn(),
  checkGateSeal: jest.fn(),
  getExpiryTimestamp: jest.fn(),
  getETHDistributedEvent: jest.fn(),
})
