import { IAclChangesClient } from '../contract'

export const AclChangesClientMock = (): jest.Mocked<IAclChangesClient> => ({
  getRoleMembers: jest.fn(),
  getOwner: jest.fn(),
  isDeployed: jest.fn(),
})
