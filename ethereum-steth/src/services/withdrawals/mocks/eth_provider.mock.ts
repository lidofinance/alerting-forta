import { IWithdrawalsClient } from '../contract'

export const WithdrawalsClientMock = (): jest.Mocked<IWithdrawalsClient> => ({
  getTransaction: jest.fn(),
  getStartedBlockForApp: jest.fn(),
  getBalance: jest.fn(),
  getStakingLimitInfo: jest.fn(),
  getUnfinalizedStETH: jest.fn(),
  getWithdrawalStatuses: jest.fn(),
  getTotalPooledEther: jest.fn(),
  getTotalShares: jest.fn(),
  isBunkerModeActive: jest.fn(),
  getBunkerTimestamp: jest.fn(),
  getWithdrawalLastRequestId: jest.fn(),
  getWithdrawalStatus: jest.fn(),
})
