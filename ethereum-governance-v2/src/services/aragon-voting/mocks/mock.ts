import { IAragonVotingClient } from '../contract'

export const AragonVotingClientMock = (): jest.Mocked<IAragonVotingClient> => ({
  getStartedVotes: jest.fn(),
  getVote: jest.fn(),
})
