import { IProxyWatcherClient } from '../contract'

export const ProxyWatcherClientMock = (): jest.Mocked<IProxyWatcherClient> => ({
  isDeployed: jest.fn(),
  getProxyImplementation: jest.fn(),
})
