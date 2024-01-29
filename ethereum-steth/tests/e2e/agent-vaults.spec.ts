import { App } from '../../src/app'
import { Finding, FindingSeverity, FindingType, getEthersProvider } from 'forta-agent'
import { etherBlockToFortaBlockEvent } from './utils'

describe('agent-vaults e2e tests', () => {
  const ethProvider = getEthersProvider()

  test('should process block with high EL vault balance difference', async () => {
    const app = await App.getInstance()

    const blockNumber = 17007842
    const block = await ethProvider.getBlock(17007842)

    app.VaultSrv.initialize(blockNumber)
    const blockEvent = etherBlockToFortaBlockEvent(block)
    const result = await app.VaultSrv.handleBlock(blockEvent)

    const expected = Finding.fromObject({
      alertId: 'EL-VAULT-BALANCE-CHANGE',
      description: `EL Vault Balance has increased by 689.017 ETH`,
      name: '💵 EL Vault Balance significant change',
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })

    expect(result.length).toEqual(1)
    expect(result[0].alertId).toEqual(expected.alertId)
    expect(result[0].description).toEqual(expected.description)
    expect(result[0].name).toEqual(expected.name)
    expect(result[0].severity).toEqual(expected.severity)
    expect(result[0].type).toEqual(expected.type)
  })
})
