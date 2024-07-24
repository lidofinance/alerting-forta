import { BlockDto, TransactionDto } from '../../entity/events'
import * as Winston from 'winston'
import { ethers, Finding } from 'forta-agent'

import { VaultWatcherSrv } from './VaultWatcher.srv'
import { App } from '../../app'

const TEST_TIMEOUT = 120_000 // ms

describe('VaultWatchers srv functional tests', () => {
  const drpcURL = `https://eth.drpc.org`
  const mainnet = 1
  const ethProvider = new ethers.providers.JsonRpcProvider(drpcURL, mainnet)

  const ethClient = App.prepareClient(ethProvider)

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const service = new VaultWatcherSrv(logger, ethClient)

  let runTransaction: (txHash: string, initBlock?: number) => Promise<Finding[]>
  let runBlock: (blockHashOrNumber: string | number, initBlock: number) => Promise<Finding[]>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-01').getTime())

    runBlock = async (blockHashOrNumber, initBlock) => {
      if (initBlock > Number(blockHashOrNumber)) {
        throw new Error('Wrong initial block or argument order')
      }
      const initErr = await service.initialize(initBlock)
      if (initErr instanceof Error) {
        throw initErr
      }
      const block = await ethProvider.getBlock(blockHashOrNumber)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      return service.handleBlock(blockDto)
    }

    runTransaction = async (txHash: string) => {
      const trx = await ethProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
        transaction: {
          data: trx.data || '',
          hash: trx.hash || '',
        },
      }

      return service.handleTransaction(transactionDto)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should RoleRevoked',
    async () => {
      const findings = await runTransaction('0xb8b96ee47cadb80ec41dafceba1fe5b10b1d50b75e7ad9114ee16180bda2d2b4')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should RoleGranted',
    async () => {
      const findings = await runTransaction('0x28cbf0521b4e6c03bf719cf958516609b3bf678b2f20dc958ae2db8999345fc5')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should RoleAdminChanged (3+2)',
    async () => {
      const findings = await runTransaction('0x047e8dd86f2e58fd05630e3fa1d1b1ce4a7638e3138cf9762894cf99a4fcabe6')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should be not slot changes',
    async () => {
      const findings = await runTransaction(
        '0xffef3e8046d882ccd5773582438ebf6576e4093dec734ed27e0f5065d1a89d7b',
        20061165,
      )
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should everything is fine',
    async () => {
      const findings = await runBlock(20207135, 20207134)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with Added Owner and Execution Success',
    async () => {
      const findings = await runTransaction('0x4c3e507fd78daac24dd75e33e7c69381481db8bce62c795d2eec67126ad6d396')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should show limit inc',
    async () => {
      const findings = await runTransaction('0xfb1a547bd1da10635513779fc7ecfd12d8db3f39593f7538ab77f61484592a3c')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with Changed Threshold and Execution Success',
    async () => {
      const findings = await runTransaction('0xb58e9e81ad1dac1f33b9dfc4d19f2d909a2a3ea890c31aa27a0df10f86bd4eea')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should withdrawal from contract',
    async () => {
      const findings = await runTransaction('0x17c222325fa85abc5a0e74708264c751cbf54e6f06fdfd852d520e3bee1b0596')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should withdrawal from curator',
    async () => {
      const findings = await runTransaction('0x07f911ae589572a8f73404289932e9faf70735eaa9347c79557888dd10624fb5')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should withdrawal from curator multicall',
    async () => {
      const findings = await runTransaction('0x5fb0b597627bfc2c4031738f99ee28df7e831b8ca9277cc4d5fe62e16506ce51')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should should find 1 withdrawal',
    async () => {
      const findings = await runBlock(20203686, 20203685)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should find no-withdrawals at 1 vaults',
    async () => {
      const findings = await runBlock(20188825, 20188824)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with Re7 Vault withdrawal all',
    async () => {
      const findings = await runTransaction('0x74ba54139103dc266b50cb6e2f04d53398809290851a4c90d8d40e73a4db5e8e')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should find Steakhouse Vault slot change',
    async () => {
      const findings = await runBlock(20266488, 20266480)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should find InfStones Restaked slot change',
    async () => {
      const findings = await runBlock(20184204, 20184203)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
