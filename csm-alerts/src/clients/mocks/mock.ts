import { IEtherscanProvider } from '../eth_provider'

export const EtherscanProviderMock = (): jest.Mocked<IEtherscanProvider> => ({
  getBalance: jest.fn(),
})
