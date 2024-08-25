import { strict as assert } from 'node:assert'
import { expect } from '@jest/globals'
import { L2Network, getEventBasedAlerts } from '../src/common/alert-bundles'

import { globalExtended, paramsByNetwork, getBlockEvent, consoleDebugFinding, getAlertsString, skipNetwork } from './test.helpers'
import { SECOND_MS } from '../src/common/utils/time'

import { Agent } from '../src/common/agent'


describe('Bundle tests', () => {

  test(`All event-based tests`, async () => {

    for (const network of Object.values(L2Network)) {
      if (skipNetwork(network)) { continue }
      assert(network !== L2Network.Default)

      const app = new Agent({ ...paramsByNetwork[network], L2_NETWORK_RPC: globalExtended.testNodes[network].rpcUrl })

      await app.initialize()
      const findings = await app.handleBlock(await getBlockEvent(app.l1Provider, 'latest'))
      expect(findings).toHaveLength(1)
      expect(findings[0].getAlertid()).toEqual('LIDO-AGENT-LAUNCHED')

      const networkAlerts = getEventBasedAlerts(network)
      for (const alert of networkAlerts) {
        // if (alert.alertId !== 'PROXY-UPGRADED') { continue }

        if (!alert.simulate) {
          app.logger.info(`SKIP: ${alert.alertId} for ${network} at ${alert.address} (no simulate function)`)
          continue
        }

        // TODO: if use snapshots need to reinitialize app every time
        // const snapshotId = await app.l2Provider.send('evm_snapshot', [])

        await alert.simulate(app.l2Provider, alert.address)
        await app.l2Provider.send("hardhat_mine", ["0x01"])

        const findings = await app.handleBlock(await getBlockEvent(app.l1Provider, 'latest'))
        // expect(findings.length).toBe(1)
        expect(findings.length).toBeGreaterThanOrEqual(1)

        app.logger.info(`🟢 ${alert.alertId} for ${network} at ${alert.address}: ${getAlertsString(findings)}`)

        // await app.l2Provider.send('evm_revert', [snapshotId])
      }

      await app.close()
    }
  }, 30 * 60 * SECOND_MS) // TODO: same timeout
})
