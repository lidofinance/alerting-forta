import { IGateSealClient } from '../contract'

export const GateSealClientMock = (): jest.Mocked<IGateSealClient> => ({
  checkGateSeal: jest.fn(),
  getExpiryTimestamp: jest.fn(),
})
