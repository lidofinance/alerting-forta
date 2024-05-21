import { IGateSealClient } from '../GateSeal.srv'

export const GateSealClientMock = (): jest.Mocked<IGateSealClient> => ({
  checkGateSeal: jest.fn(),
  getExpiryTimestamp: jest.fn(),
})
