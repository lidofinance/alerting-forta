import { IVaultClient } from '../contract'

export const VaultClientMock = (): jest.Mocked<IVaultClient> => ({
  getBalance: jest.fn(),
  getBalanceByBlockHash: jest.fn(),
  getETHDistributedEvent: jest.fn(),
})
