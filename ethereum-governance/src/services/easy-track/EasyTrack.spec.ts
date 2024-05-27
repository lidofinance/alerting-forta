import { EasyTrackSrv } from './EasyTrack.srv'
import { LogDescription, TransactionEvent } from 'forta-agent'
import { Logger } from 'winston'
import { IEasyTrackClient, INodeOperatorInfo } from './contract'
import * as E from 'fp-ts/Either'
import {
  EASY_TRACK_ADDRESS,
  INCREASE_STAKING_LIMIT_ADDRESS as increaseStakingLimitAddress,
} from '../../shared/constants/common/mainnet'
import BigNumber from 'bignumber.js'

describe('EasyTrackSrv', () => {
  let logger: Logger
  let ethProvider: IEasyTrackClient
  let easyTrackSrv: EasyTrackSrv
  let txEvent: TransactionEvent

  beforeEach(() => {
    logger = { info: jest.fn() } as unknown as Logger
    ethProvider = { getNOInfoByMotionData: jest.fn() } as unknown as IEasyTrackClient
    easyTrackSrv = new EasyTrackSrv(logger, ethProvider)
    txEvent = { addresses: { '0x123': true }, filterLog: jest.fn() } as unknown as TransactionEvent
  })

  it('initializes without error', () => {
    expect(() => easyTrackSrv.initialize(100)).not.toThrow()
  })

  it('returns the correct name', () => {
    expect(easyTrackSrv.getName()).toBe('EasyTrack')
  })

  it('handles EasyTrack motion created without error when no EasyTrack address in transaction', async () => {
    const findings = await easyTrackSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
  })

  it.each([
    {
      evmFactoryAddress: '0x123',
      totalSigningKeys: BigNumber(100),
      stakingLimit: BigNumber(50),
      expectedName: 'ℹ️ EasyTrack: New motion created',
      expectedDescription: 'New  motion [1](https://easytrack.lido.fi/motions/1) created by 0x123',
    },
    {
      evmFactoryAddress: increaseStakingLimitAddress,
      totalSigningKeys: BigNumber(100),
      stakingLimit: BigNumber(50),
      expectedName: 'ℹ️ EasyTrack: New motion created',
      expectedDescription:
        'Increase node operator staking limit motion [1](https://easytrack.lido.fi/motions/1) created by 0x123\nOperator Test wants to increase staking limit to **50**.\nNo issues with keys! ✅',
    },
    {
      evmFactoryAddress: increaseStakingLimitAddress,
      totalSigningKeys: BigNumber(50),
      stakingLimit: BigNumber(100),
      expectedName: '⚠️️ EasyTrack: New motion created',
      expectedDescription:
        'Increase node operator staking limit motion [1](https://easytrack.lido.fi/motions/1) created by 0x123\nOperator Test wants to increase staking limit to **100**.\nBut operator has not enough keys uploaded! ⚠️\nRequired: 100\nAvailable: 50',
    },
  ])(
    'handles EasyTrack Increase node operator staking limit motion',
    async ({ evmFactoryAddress, totalSigningKeys, stakingLimit, expectedName, expectedDescription }) => {
      txEvent.addresses[EASY_TRACK_ADDRESS] = true
      jest.mocked(txEvent.filterLog).mockReturnValue([
        {
          args: {
            _evmScriptFactory: evmFactoryAddress,
            _motionId: '1',
            _creator: '0x123',
            _evmScriptCallData: '0x123',
          },
        } as unknown as LogDescription,
      ])
      jest.spyOn(ethProvider, 'getNOInfoByMotionData').mockResolvedValue(
        E.right({
          name: 'Test',
          totalSigningKeys: totalSigningKeys,
          stakingLimit: stakingLimit,
        } as unknown as INodeOperatorInfo),
      )

      const findings = await easyTrackSrv.handleEasyTrackMotionCreated(txEvent)

      expect(findings).toHaveLength(1)
      expect(findings[0].name).toBe(expectedName)
      expect(findings[0].description).toBe(expectedDescription)
      expect(findings[0].alertId).toBe('EASY-TRACK-MOTION-CREATED')
    },
  )
})
