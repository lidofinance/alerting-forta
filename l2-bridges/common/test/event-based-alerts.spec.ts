import { strict as assert } from 'node:assert'
import { expect } from '@jest/globals'
import { L2Network, getEventBasedAlerts, skipNetwork } from '../alert-bundles'

import { getLatestBlockEvent as getBlockEvent } from '../../common/utils/test.helpers'
import { SECOND_MS } from '../../common/utils/time'
import { globalExtended, paramsByNetwork } from '../utils/test.helpers'
import { App } from '../agent'


describe('Bundle tests', () => {

  test(`All event-based tests`, async () => {

    for (const network of Object.values(L2Network)) {
      if (skipNetwork(network)) { continue }
      assert(network !== L2Network.Default)

      const app = new App({ ...paramsByNetwork[network], L2_NETWORK_RPC: globalExtended.testNodes[network].rpcUrl })

      await app.initialize()
      const dummyBlockEvent = await getBlockEvent(app.provider, 'latest')
      const findings = await app.handleBlock(dummyBlockEvent)

      const networkAlerts = getEventBasedAlerts(network)
      for (const alert of networkAlerts) {
        if (!alert.simulate) {
          app.logger.info(`SKIP: ${alert.alertId} for ${network} at ${alert.address} (no simulate function)`)
          continue
        }
        const snapshotId = await app.provider.send('evm_snapshot', [])

        // TODO: if use snapshots need to reinitialize app every time

        await alert.simulate(app.provider, alert.address)
        await app.provider.send("hardhat_mine", ["0x01"])

        const findings = await app.handleBlock(dummyBlockEvent)
        expect(findings.length).toBeGreaterThan(0)
        app.logger.info(`DONE: ${alert.alertId} for ${network} at ${alert.address}`)

        await app.provider.send('evm_revert', [snapshotId])
      }
    }
  }, 30 * 60 * SECOND_MS) // TODO: same timeout
})
