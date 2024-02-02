import { getEthersProvider } from 'forta-agent'
import { etherBlockToFortaBlockEvent } from '../../../tests/e2e/utils'
import { App } from '../../app'
import { Address } from '../../utils/constants'
import * as E from 'fp-ts/Either'
import { GateSeal } from '../../entity/gate_seal'

describe('GateSeal srv e2e tests', () => {
  const ethProvider = getEthersProvider()

  test('handle pause role true', async () => {
    const app = await App.getInstance()

    const blockNumber = 19113580
    const block = await ethProvider.getBlock(blockNumber)

    const initErr = await app.GateSealSrv.initialize(blockNumber)
    if (initErr instanceof Error) {
      fail(initErr.message)
    }

    const status = await app.ethClient.checkGateSeal(blockNumber, Address.GATE_SEAL_DEFAULT_ADDRESS)
    if (E.isLeft(status)) {
      fail(status.left)
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
})
