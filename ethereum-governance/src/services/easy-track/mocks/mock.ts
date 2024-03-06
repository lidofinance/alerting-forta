import { IEasyTrackClient } from '../contract'

export const EasyTrackMock = (): jest.Mocked<IEasyTrackClient> => ({
  getNOInfoByMotionData: jest.fn(),
})
