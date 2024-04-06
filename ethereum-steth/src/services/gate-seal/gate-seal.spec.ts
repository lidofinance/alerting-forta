import { Finding, FindingSeverity, FindingType, getEthersProvider } from 'forta-agent'
import { etherBlockToFortaBlockEvent } from '../../../tests/e2e/utils'
import { App } from '../../app'
import { Address } from '../../utils/constants'
import * as E from 'fp-ts/Either'
import { GateSeal } from '../../entity/gate_seal'
import { expect } from '@jest/globals'

describe('GateSeal srv e2e tests', () => {
  const ethProvider = getEthersProvider()

  test('handle pause role true', async () => {
    const app = await App.getInstance()

    const blockNumber = 19113580
    const block = await ethProvider.getBlock(blockNumber)

    const initErr = await app.GateSealSrv.initialize(blockNumber)
    if (initErr instanceof Error) {
      throw initErr
    }

    const status = await app.ethClient.checkGateSeal(blockNumber, Address.GATE_SEAL_DEFAULT_ADDRESS)
    if (E.isLeft(status)) {
      throw status
    }

    const expected: GateSeal = {
      roleForWithdrawalQueue: true,
      roleForExitBus: true,
      exitBusOracleAddress: '0x0de4ea0184c2ad0baca7183356aea5b8d5bf5c6e',
      withdrawalQueueAddress: '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1',
    }
    expect(status.right).toEqual(expected)

    const blockEvent = etherBlockToFortaBlockEvent(block)
    const result = await app.GateSealSrv.handlePauseRole(blockEvent)

    expect(result.length).toEqual(0)
  }, 120_000)

  test('⚠️ GateSeal: is about to be expired', async () => {
    const app = await App.getInstance()

    const initBlock = 19_172_614

    const initErr = await app.GateSealSrv.initialize(initBlock)
    if (initErr instanceof Error) {
      throw initErr
    }

    const neededBlock = 19_172_615
    const block = await ethProvider.getBlock(neededBlock)
    const blockEvent = etherBlockToFortaBlockEvent(block)
    const result = await app.GateSealSrv.handleExpiryGateSeal(blockEvent)

    const expected = Finding.fromObject({
      alertId: 'GATE-SEAL-IS-ABOUT-TO-BE-EXPIRED',
      description:
        'GateSeal address: [0x1ad5cb2955940f998081c1ef5f5f00875431aa90](https://etherscan.io/address/0x1ad5cb2955940f998081c1ef5f5f00875431aa90)\n' +
        'Expiry date Wed, 01 May 2024 00:00:00 GMT',
      name: '⚠️ GateSeal: is about to be expired',
      severity: FindingSeverity.Medium,
      type: FindingType.Degraded,
    })

    expect(result.length).toEqual(1)
    expect(result[0].alertId).toEqual(expected.alertId)
    expect(result[0].description).toEqual(expected.description)
    expect(result[0].name).toEqual(expected.name)
    expect(result[0].severity).toEqual(expected.severity)
    expect(result[0].type).toEqual(expected.type)
  }, 120_000)
})
