import { IStethClient } from '../contracts'

export const StethClientMock = (): jest.Mocked<IStethClient> => ({
  getHistory: jest.fn(),
  getStethBalance: jest.fn(),
  getBalance: jest.fn(),
  getBufferedEther: jest.fn(),
  getShareRate: jest.fn(),
  getWithdrawalsFinalizedEvents: jest.fn(),
  getDepositableEther: jest.fn(),
  getStakingLimitInfo: jest.fn(),
  getUnbufferedEvents: jest.fn(),
})
