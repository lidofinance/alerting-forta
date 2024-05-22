import { App } from '../../app'
import { BlockDto } from '../../entity/events'
import { JsonRpcProvider } from '@ethersproject/providers'
import { expect } from '@jest/globals'
import { ethers } from 'ethers'
import { Finding } from '../../generated/proto/alert_pb'

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

      const expected = {
        alertId: 'EL-VAULT-BALANCE-CHANGE',
        description: `EL Vault Balance has increased by 689.017 ETH`,
        name: 'ℹ️ EL Vault Balance significant change',
        severity: Finding.Severity.INFO,
        type: Finding.FindingType.INFORMATION,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )
})
