import { ethers, Finding, FindingSeverity, FindingType, getEthersProvider, Network, Transaction } from 'forta-agent'
import { App } from '../../app'
import { Address } from '../../utils/constants'
import * as E from 'fp-ts/Either'
import { GateSeal } from '../../entity/gate_seal'
import { expect } from '@jest/globals'
import { BlockDto } from '../../entity/events'
import { createTransactionEvent } from '../../utils/forta'

const TEST_TIMEOUT = 120_000 // ms

describe('GateSeal srv functional tests', () => {
  const ethProvider = getEthersProvider()

  test(
    'handle pause role true',
    async () => {
      const app = await App.getInstance()

      const blockNumber = 19113580
      const block = await ethProvider.getBlock(blockNumber)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

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

      const result = await app.GateSealSrv.handlePauseRole(blockDto)

      expect(result.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )

  test(
    '⚠️ GateSeal: is about to be expired',
    async () => {
      const app = await App.getInstance()

      const initBlock = 19_172_614

      const initErr = await app.GateSealSrv.initialize(initBlock)
      if (initErr instanceof Error) {
        throw initErr
      }

      const neededBlock = 19_172_615
      const block = await ethProvider.getBlock(neededBlock)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }
      const result = await app.GateSealSrv.handleExpiryGateSeal(blockDto)

      const expected = Finding.fromObject({
        alertId: 'GATE-SEAL-IS-ABOUT-TO-BE-EXPIRED',
        description:
          'GateSeal address: [0x79243345edbe01a7e42edff5900156700d22611c](https://etherscan.io/address/0x79243345edbe01a7e42edff5900156700d22611c)\n' +
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
    },
    TEST_TIMEOUT,
  )

  test(
    '⚠️ GateSeal: a new instance deployed from factory',
    async () => {
      const app = await App.getInstance()
      const txHash = '0x1547f17108830a92673b967aff13971fae18b4d35681b93a38a97a22083deb93'

      const receipt = await ethProvider.send('eth_getTransactionReceipt', [txHash])
      const block = await ethProvider.send('eth_getBlockByNumber', [
        ethers.utils.hexValue(parseInt(receipt.blockNumber)),
        true,
      ])
      const transaction = block.transactions.find((tx: Transaction) => tx.hash.toLowerCase() === txHash)!

      const txEvent = createTransactionEvent(transaction, block, Network.MAINNET, [], receipt.logs)

      const results = await app.GateSealSrv.handleTransaction(txEvent)

      const expected = Finding.fromObject({
        alertId: 'GATE-SEAL-NEW-ONE-CREATED',
        description:
          'New instance address: [0x79243345eDbe01A7E42EDfF5900156700d22611c](https://etherscan.io/address/0x79243345eDbe01A7E42EDfF5900156700d22611c)\n' +
          'dev: Please, check if `GATE_SEAL_DEFAULT_ADDRESS` should be updated in the nearest future',
        name: '⚠️ GateSeal: a new instance deployed from factory',
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
      })

      expect(results.length).toEqual(1)
      expect(results[0].alertId).toEqual(expected.alertId)
      expect(results[0].description).toEqual(expected.description)
      expect(results[0].name).toEqual(expected.name)
      expect(results[0].severity).toEqual(expected.severity)
      expect(results[0].type).toEqual(expected.type)

      const txHashEmptyFindings = '0xb00783f3eb79bd60f63e5744bbf0cb4fdc2f98bbca54cd2d3f611f032faa6a57'

      const receiptEmptyFindings = await ethProvider.send('eth_getTransactionReceipt', [txHashEmptyFindings])
      const blockEmptyFindings = await ethProvider.send('eth_getBlockByNumber', [
        ethers.utils.hexValue(parseInt(receipt.blockNumber)),
        true,
      ])
      const transactionEmptyFindings = blockEmptyFindings.transactions.find(
        (tx: Transaction) => tx.hash.toLowerCase() === txHash,
      )!

      const txEventEmptyFindings = createTransactionEvent(
        transactionEmptyFindings,
        blockEmptyFindings,
        Network.MAINNET,
        [],
        receiptEmptyFindings.logs,
      )

      const resultsEmptyFindings = await app.GateSealSrv.handleTransaction(txEventEmptyFindings)

      expect(resultsEmptyFindings.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )
})
