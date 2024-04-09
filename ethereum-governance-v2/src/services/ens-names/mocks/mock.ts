import { IEnsNamesClient } from '../contract'

export const EnsNamesClientMock = (): jest.Mocked<IEnsNamesClient> => ({
  getEnsExpiryTimestamp: jest.fn(),
})
