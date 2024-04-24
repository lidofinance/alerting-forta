import { IEtherscanProvider } from '../eth_provider'

export const EtherscanProviderMock = (): jest.Mocked<IEtherscanProvider> => ({
  getHistory: jest.fn(),
  getBalance: jest.fn(),
})
