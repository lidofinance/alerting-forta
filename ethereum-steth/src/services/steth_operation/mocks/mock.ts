import { IStethClient } from '../StethOperation.srv'

export const StethClientMock = (): jest.Mocked<IStethClient> => ({
  getStethBalance: jest.fn(),
  getEthBalance: jest.fn(),
  getBufferedEther: jest.fn(),
  getShareRate: jest.fn(),
  getWithdrawalsFinalizedEvents: jest.fn(),
  getDepositableEther: jest.fn(),
  getStakingLimitInfo: jest.fn(),
  getUnbufferedEvents: jest.fn(),
  getChainPrevBlocks: jest.fn(),
  getBlockByNumber: jest.fn(),
})
