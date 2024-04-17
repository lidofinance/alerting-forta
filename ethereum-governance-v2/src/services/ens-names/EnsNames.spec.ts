import { EnsNamesSrv } from './EnsNames.srv'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { Logger } from 'winston'
import { IEnsNamesClient } from './contract'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../../shared/errors'
import BigNumber from 'bignumber.js'
import { ENS_CHECK_INTERVAL, LIDO_ENS_NAMES } from '../../shared/constants/ens-names/mainnet'
import { ONE_WEEK } from '../../shared/time'
import { expect } from '@jest/globals'

describe('EnsNamesSrv', () => {
  let logger: Logger
  let ethProvider: IEnsNamesClient
  let ensNamesSrv: EnsNamesSrv
  let blockEvent: BlockEvent

  beforeEach(() => {
    logger = { info: jest.fn() } as unknown as Logger
    ethProvider = {
      getEnsExpiryTimestamp: jest.fn(),
    } as unknown as IEnsNamesClient
    ensNamesSrv = new EnsNamesSrv(logger, ethProvider)
    blockEvent = { block: { number: 100, timestamp: 1000 } } as BlockEvent
  })

  it('initializes without error', () => {
    expect(() => ensNamesSrv.initialize(100)).not.toThrow()
  })

  it('returns the correct name', () => {
    expect(ensNamesSrv.getName()).toBe('EnsNamesSrv')
  })

  it('handles block without error when block number is not divisible by ENS_CHECK_INTERVAL', async () => {
    jest.spyOn(ethProvider, 'getEnsExpiryTimestamp').mockResolvedValue(E.right(BigNumber(2000)))

    const findings = await ensNamesSrv.handleBlock(blockEvent)

    expect(findings).toEqual([])
  })

  it('handles block and returns findings when block number is divisible by ENS_CHECK_INTERVAL and domain expires in less than a 2 week', async () => {
    blockEvent.block.number = ENS_CHECK_INTERVAL * 5
    jest.spyOn(ethProvider, 'getEnsExpiryTimestamp').mockResolvedValue(E.right(BigNumber(ONE_WEEK * 2 - 1)))

    const findings = await ensNamesSrv.handleBlock(blockEvent)

    expect(findings).toEqual(
      LIDO_ENS_NAMES.map((domainName) =>
        Finding.fromObject({
          name: '⚠️ ENS: Domain expires soon',
          description: `Domain rent for ${domainName}.eth expires in less than a 2 weeks`,
          alertId: 'ENS-RENT-EXPIRES',
          severity: FindingSeverity.Critical,
          type: FindingType.Info,
        }),
      ),
    )
  })

  it('handles block and returns findings when block number is divisible by ENS_CHECK_INTERVAL and domain expires in less than a month', async () => {
    blockEvent.block.number = ENS_CHECK_INTERVAL * 5
    jest.spyOn(ethProvider, 'getEnsExpiryTimestamp').mockResolvedValue(E.right(BigNumber(ONE_WEEK * 2 + 1)))

    const findings = await ensNamesSrv.handleBlock(blockEvent)

    expect(findings).toEqual(
      LIDO_ENS_NAMES.map((domainName) =>
        Finding.fromObject({
          name: '⚠️ ENS: Domain expires soon',
          description: `Domain rent for ${domainName}.eth expires in less than a 2 weeks`,
          alertId: 'ENS-RENT-EXPIRES',
          severity: FindingSeverity.Critical,
          type: FindingType.Info,
        }),
      ),
    )
  })

  it('handles block and returns network alert when getEnsExpiryTimestamp fails', async () => {
    const assertedFindings = LIDO_ENS_NAMES.map((domainName) => {
      const finding = networkAlert(
        new Error('Test error'),
        `Error in ${EnsNamesSrv.name}.${ensNamesSrv.handleEnsNamesExpiration.name} (uid:88ea9fb0)`,
        `Could not call ethProvider.getEnsExpiryTimestamp for name - ${domainName}`,
      )
      return expect.objectContaining({
        name: finding.name,
        description: finding.description,
        alertId: finding.alertId,
        severity: finding.severity,
        type: finding.type,
      })
    })
    blockEvent.block.number = ENS_CHECK_INTERVAL * 5
    jest.spyOn(ethProvider, 'getEnsExpiryTimestamp').mockResolvedValue(E.left(new Error('Test error')))

    const findings = await ensNamesSrv.handleBlock(blockEvent)

    expect(findings).toEqual(expect.arrayContaining(assertedFindings))
  })
})
