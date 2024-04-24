import { App } from '../../app'
import { ethers, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { BlockDto } from '../../entity/events'
import { JsonRpcProvider } from '@ethersproject/providers'

const TEST_TIMEOUT = 120_000 // ms

describe('Vaults.srv functional tests', () => {
  let ethProvider: JsonRpcProvider
  const mainnet = 1
  const drpcProvider = 'https://eth.drpc.org/'

  beforeAll(async () => {
    ethProvider = new ethers.providers.JsonRpcProvider(drpcProvider, mainnet)
  })

  test(
    'EL-VAULT-BALANCE-CHANGE',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 17_007_842
      const block = await ethProvider.getBlock(blockNumber)

      app.VaultSrv.initialize(blockNumber)

      const blockEvent: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      const result = await app.VaultSrv.handleBlock(blockEvent)

      const expected = Finding.fromObject({
        alertId: 'EL-VAULT-BALANCE-CHANGE',
        description: `EL Vault Balance has increased by 689.017 ETH`,
        name: 'ℹ️ EL Vault Balance significant change',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )
})
