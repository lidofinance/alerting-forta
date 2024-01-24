import {
  MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL,
  MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL_TIME,
  MAX_DEPOSITABLE_ETH_AMOUNT_MEDIUM,
  MAX_DEPOSITOR_TX_DELAY,
  MIN_DEPOSIT_EXECUTOR_BALANCE,
  StethOperationSrv,
} from './StethOperation.srv'
import { IETHProvider } from '../../clients/eth_provider'
import { StethOperationCache } from './StethOperation.cache'
import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS } from '../../utils/constants'
import {
  getDepositSecurityEvents,
  getFilteredDepositSecurityEventsMock,
} from '../../utils/events/deposit_security_events'
import { getFilteredLidoEventsMock, getLidoEvents } from '../../utils/events/lido_events'
import { getFilteredInsuranceFundEventsMock, getInsuranceFundEvents } from '../../utils/events/insurance_fund_events'
import { getBurnerEvents, getFilteredBurnerEventsMock } from '../../utils/events/burner_events'
import { ETHProviderMock } from '../../clients/mocks/eth_provider_mock'
import {
  LidoContractMock,
  TransactionEventContractMock,
  TypedEventMock,
  WithdrawalQueueContractMock,
} from '../../utils/contract_mocks/contract_mocks'
import { LidoContract, WithdrawalQueueContract } from './contracts'
import { expect } from '@jest/globals'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { faker } from '@faker-js/faker'
import { BigNumber as EtherBigNumber } from 'ethers'
import BigNumber from 'bignumber.js'
import { Finding, FindingSeverity, FindingType, LogDescription } from 'forta-agent'
import * as Winston from 'winston'
import { TypedEvent } from '../../generated/common'
import { StakingLimitInfo } from '../../entity/stakingLimitInfo'

describe('StethOperationSrv', () => {
  let ethProviderMock: jest.Mocked<IETHProvider>
  let lidoContractMock: jest.Mocked<LidoContract>
  let wdQueueContractMock: jest.Mocked<WithdrawalQueueContract>
  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const address = Address
  beforeEach(() => {
    ethProviderMock = ETHProviderMock()
    lidoContractMock = LidoContractMock()
    wdQueueContractMock = WithdrawalQueueContractMock()
  })

  describe('initialize', () => {
    test(`ethProvider.getHistory error`, async () => {
      const want = new Error(`getHistory error`)
      ethProviderMock.getHistory.mockResolvedValue(E.left(want))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const result = await srv.initialize(currentBlock)

      expect(result).toStrictEqual(want)
    })

    test(`ethProvider.getStethBalance error`, async () => {
      const want = new Error(`getStethBalance error`)

      const TransactionResponseMock: TransactionResponse[] = [
        {
          nonce: faker.number.int(),
          hash: faker.string.hexadecimal(),
          gasLimit: EtherBigNumber.from(faker.number.int()),
          confirmations: faker.number.int(),
          data: faker.string.hexadecimal(),
          value: EtherBigNumber.from(faker.number.int()),
          chainId: 1,
          from: faker.string.hexadecimal(),
          wait: jest.fn(),
        },
      ]
      ethProviderMock.getHistory.mockResolvedValue(E.right(TransactionResponseMock))
      ethProviderMock.getStethBalance.mockResolvedValue(E.left(want))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const result = await srv.initialize(currentBlock)

      expect(result).toStrictEqual(want)
    })

    test(`success`, async () => {
      const want = null

      const depositorTxTimeEarlier = 1702939609549
      const depositorTxTimeLater = 1702939619549
      const TransactionResponseMock: TransactionResponse[] = [
        {
          nonce: faker.number.int(),
          hash: faker.string.hexadecimal(),
          gasLimit: EtherBigNumber.from(faker.number.int()),
          confirmations: faker.number.int(),
          data: faker.string.hexadecimal(),
          value: EtherBigNumber.from(faker.number.int()),
          chainId: 1,
          from: faker.string.hexadecimal(),
          wait: jest.fn(),
          timestamp: depositorTxTimeEarlier,
        },
        {
          nonce: faker.number.int(),
          hash: faker.string.hexadecimal(),
          gasLimit: EtherBigNumber.from(faker.number.int()),
          confirmations: faker.number.int(),
          data: faker.string.hexadecimal(),
          value: EtherBigNumber.from(faker.number.int()),
          chainId: 1,
          from: faker.string.hexadecimal(),
          wait: jest.fn(),
          timestamp: depositorTxTimeLater,
        },
      ]
      ethProviderMock.getHistory.mockResolvedValue(E.right(TransactionResponseMock))

      const stethBalanceMock = new BigNumber(faker.number.bigInt().toString())
      ethProviderMock.getStethBalance.mockResolvedValue(E.right(stethBalanceMock))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const result = await srv.initialize(currentBlock)

      expect(result).toStrictEqual(want)
      expect(cache.getLastBufferedEth()).toEqual(stethBalanceMock)
      expect(cache.getLastDepositorTxTime()).toEqual(depositorTxTimeLater)
    })
  })

  describe('handleBufferedEth', () => {
    test(`ethProvider.getBufferedEther error`, async () => {
      const getBufferedEtherErr = new Error(`getBufferedEther error`)
      ethProviderMock.getBufferedEther.mockResolvedValue(E.left(getBufferedEtherErr))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = Finding.fromObject({
        alertId: 'LIDO-AGENT-ERROR',
        description: 'Could not call "ethProvider.getBufferedEther. Cause getBufferedEther error',
        name: 'Error in StethOperationSrv.handleBufferedEth:174',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })

    test(`lidoContract.getDepositableEther error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(getBufferedEther))
      lidoContractMock.getDepositableEther.mockRejectedValue(new Error('getDepositableEtherErr'))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061500
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = Finding.fromObject({
        alertId: 'LIDO-AGENT-ERROR',
        description: 'Could not call "lidoContract.getDepositableEther. Cause getDepositableEtherErr',
        name: 'Error in StethOperationSrv.handleBufferedEth:189',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })
    test(`lidoContract.shifte3dBufferedEthRaw error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      lidoContractMock.getDepositableEther.mockResolvedValue(EtherBigNumber.from(faker.number.int()))

      // shifte3dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.left(new Error('shifte3dBufferedEthRawErr')))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = Finding.fromObject({
        alertId: 'LIDO-AGENT-ERROR',
        description: 'Could not call "ethProvider.getBufferedEther". Cause shifte3dBufferedEthRawErr',
        name: 'Error in StethOperationSrv.handleBufferedEth:215',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })
    test(`lidoContract.shifte4dBufferedEthRaw error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      lidoContractMock.getDepositableEther.mockResolvedValue(EtherBigNumber.from(faker.number.int()))

      // shifte3dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(new BigNumber(faker.number.int())))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.left(new Error('shifte4dBufferedEthRawErr')))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = Finding.fromObject({
        alertId: 'LIDO-AGENT-ERROR',
        description: 'Could not call "ethProvider.getBufferedEther". Cause shifte4dBufferedEthRawErr',
        name: 'Error in StethOperationSrv.handleBufferedEth:230',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })

    test(`unbufferedEventsErr error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      lidoContractMock.getDepositableEther.mockResolvedValueOnce(EtherBigNumber.from(faker.number.int()))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(faker.number.int())
      const shifte4dBufferedEthRaw = new BigNumber(shifte3dBufferedEthRaw.plus(faker.number.int()))
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      // lidoContractMock.filters.Unbuffered.mockResolvedValue()
      lidoContractMock.queryFilter.mockRejectedValue(new Error('UnbufferedEventsErr'))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = Finding.fromObject({
        alertId: 'LIDO-AGENT-ERROR',
        description: 'Could not fetch unbufferedEvents. Cause UnbufferedEventsErr',
        name: 'Error in StethOperationSrv.handleBufferedEth:251',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })

    test(`wdReqFinalizedEvents error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      lidoContractMock.getDepositableEther.mockResolvedValueOnce(EtherBigNumber.from(faker.number.int()))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(faker.number.int())
      const shifte4dBufferedEthRaw = new BigNumber(shifte3dBufferedEthRaw.plus(faker.number.int()))
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      const unbufferedEvents: TypedEvent[] = [TypedEventMock(), TypedEventMock()]

      lidoContractMock.queryFilter.mockResolvedValue(unbufferedEvents)

      wdQueueContractMock.queryFilter.mockRejectedValue(new Error('wdReqFinalizedEventsErr'))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = Finding.fromObject({
        alertId: 'LIDO-AGENT-ERROR',
        description: 'Could not fetch wdReqFinalizedEvents. Cause wdReqFinalizedEventsErr',
        name: 'Error in StethOperationSrv.handleBufferedEth:222',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })

    test(`unbufferedEvents.length === 0 && wdReqFinalizedEvents.length === 0`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      lidoContractMock.getDepositableEther.mockResolvedValueOnce(EtherBigNumber.from(faker.number.int()))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(faker.number.int())
      const shifte4dBufferedEthRaw = new BigNumber(shifte3dBufferedEthRaw.plus(faker.number.int()))
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      const unbufferedEvents: TypedEvent[] = []
      lidoContractMock.queryFilter.mockResolvedValue(unbufferedEvents)
      const wdReqFinalizedEvents: TypedEvent[] = []
      wdQueueContractMock.queryFilter.mockResolvedValue(wdReqFinalizedEvents)

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const shiftedBlockNumber = currentBlock - 3
      const expected = Finding.fromObject({
        alertId: 'BUFFERED-ETH-DRAIN',
        description:
          `Buffered ETH amount decreased from ` +
          `${shifte4dBufferedEthRaw.div(ETH_DECIMALS).toFixed(2)} ` +
          `to ${shifte3dBufferedEthRaw.div(ETH_DECIMALS).toFixed(2)} ` +
          `without Unbuffered or WithdrawalsFinalized events\n\nNote: actual handled block number is ${shiftedBlockNumber}`,
        name: '🚨🚨🚨 Buffered ETH drain',
        severity: FindingSeverity.Critical,
        type: FindingType.Suspicious,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })

    test(`⚠️ High depositable ETH amount`, async () => {
      const bufferedEther = new BigNumber(180).multipliedBy(ETH_DECIMALS)
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(bufferedEther))

      const mockDepositableEther = EtherBigNumber.from(MAX_DEPOSITABLE_ETH_AMOUNT_MEDIUM + 1).mul(
        EtherBigNumber.from(ETH_DECIMALS.toString()),
      )
      lidoContractMock.getDepositableEther.mockResolvedValueOnce(EtherBigNumber.from(mockDepositableEther.toString()))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(200)
      const shifte4dBufferedEthRaw = new BigNumber(100)
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      const unbufferedEvents: TypedEvent[] = [TypedEventMock()]
      lidoContractMock.queryFilter.mockResolvedValue(unbufferedEvents)
      const wdReqFinalizedEvents: TypedEvent[] = [TypedEventMock()]
      wdQueueContractMock.queryFilter.mockResolvedValue(wdReqFinalizedEvents)

      const currentBlock = 19061500
      const date = new Date('2024-01-22')
      const currentBlockTimestamp = date.getTime()

      const cache = new StethOperationCache()

      cache.setLastDepositorTxTime(date.setHours(-(MAX_DEPOSITOR_TX_DELAY + 1)))
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const bufferedEth = bufferedEther.div(ETH_DECIMALS).toNumber()
      const expected = Finding.fromObject({
        alertId: 'HIGH-DEPOSITABLE-ETH',
        description:
          `There are ${bufferedEth.toFixed(2)} ` +
          `depositable ETH in DAO and there are more than ` +
          `${Math.floor(MAX_DEPOSITOR_TX_DELAY / (60 * 60))} ` +
          `hours since last Depositor TX`,
        name: '⚠️ High depositable ETH amount',
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)

      expect(cache.getLastReportedDepositableEthTimestamp()).toEqual(currentBlockTimestamp)
    })

    test(`🚨 Huge depositable ETH amount`, async () => {
      const bufferedEther = new BigNumber(180).multipliedBy(ETH_DECIMALS)
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(bufferedEther))

      const mockDepositableEther = EtherBigNumber.from(MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL + 1).mul(
        EtherBigNumber.from(ETH_DECIMALS.toString()),
      )
      lidoContractMock.getDepositableEther.mockResolvedValueOnce(EtherBigNumber.from(mockDepositableEther.toString()))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(200)
      const shifte4dBufferedEthRaw = new BigNumber(100)
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      const unbufferedEvents: TypedEvent[] = [TypedEventMock()]
      lidoContractMock.queryFilter.mockResolvedValue(unbufferedEvents)
      const wdReqFinalizedEvents: TypedEvent[] = [TypedEventMock()]
      wdQueueContractMock.queryFilter.mockResolvedValue(wdReqFinalizedEvents)

      const currentBlock = 19061500
      const date = new Date('2024-01-22')
      const currentBlockTimestamp = date.getTime()

      const cache = new StethOperationCache()

      cache.setCriticalDepositableAmountTimestamp(date.setHours(-26))

      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = Finding.fromObject({
        alertId: 'HUGE-DEPOSITABLE-ETH',
        description:
          `There are 20001.00 depositable ETH in DAO for more than ` +
          `${Math.floor(MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL_TIME / (60 * 60))} hour(s)`,
        name: '🚨 Huge depositable ETH amount',
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)

      expect(cache.getLastReportedDepositableEthTimestamp()).toEqual(currentBlockTimestamp)
    })
  })

  describe('handleDepositExecutorBalance', () => {
    test('getBalanceErr', async () => {
      const executorBalanceRaw = new Error('getBalanceErr')
      ethProviderMock.getBalance.mockResolvedValueOnce(E.left(executorBalanceRaw))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleDepositExecutorBalance(blockNumber, currentBlockDate.getTime())

      const expected = Finding.fromObject({
        alertId: 'LIDO-AGENT-ERROR',
        description: `Could not fetch depositorBalance. Cause getBalanceErr`,
        name: 'Error in StethOperationSrv.handleDepositExecutorBalance:376',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })

    test('⚠️ Low deposit executor balance', async () => {
      const executorBalanceRaw = new BigNumber(MIN_DEPOSIT_EXECUTOR_BALANCE - 1).multipliedBy(ETH_DECIMALS)
      ethProviderMock.getBalance.mockResolvedValueOnce(E.right(executorBalanceRaw))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleDepositExecutorBalance(blockNumber, currentBlockDate.getTime())

      const expected = Finding.fromObject({
        alertId: 'LOW-DEPOSIT-EXECUTOR-BALANCE',
        description: `Balance of deposit executor is 1.0000. This is extremely low! 😱`,
        name: '⚠️ Low deposit executor balance',
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)

      expect(cache.getLastReportedExecutorBalanceTimestamp()).toEqual(currentBlockDate.getTime())
    })
  })

  describe('handleStakingLimit', () => {
    test('getStakingLimitInfoErr', async () => {
      const getStakingLimitInfo = new Error('getStakingLimitInfoErr')
      ethProviderMock.getStakingLimitInfo.mockResolvedValueOnce(E.left(getStakingLimitInfo))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleStakingLimit(blockNumber, currentBlockDate.getTime())

      const expected = Finding.fromObject({
        alertId: 'LIDO-AGENT-ERROR',
        description: `Could not call "lidoContract.getStakeLimitFullInfo. Cause getStakingLimitInfoErr`,
        name: 'Error in StethOperationSrv.handleStakingLimit:418',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    })

    test('⚠️ Staking limit below 10%', async () => {
      const getStakingLimitInfo: StakingLimitInfo = {
        currentStakeLimit: new BigNumber(9),
        isStakingPaused: false,
        maxStakeLimit: new BigNumber(100),
      }
      ethProviderMock.getStakingLimitInfo.mockResolvedValueOnce(E.right(getStakingLimitInfo))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleStakingLimit(blockNumber, currentBlockDate.getTime())

      const expected = Finding.fromObject({
        alertId: 'LOW-STAKING-LIMIT',
        description: `Current staking limit is 9.00 ETH this is lower than 10% of max staking limit 100.00 ETH`,
        name: '⚠️ Staking limit below 10%',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)

      expect(cache.getLastReportedStakingLimit10Timestamp()).toEqual(currentBlockDate.getTime())
    })

    test('⚠️ Staking limit below 30%', async () => {
      const getStakingLimitInfo: StakingLimitInfo = {
        currentStakeLimit: new BigNumber(250),
        isStakingPaused: false,
        maxStakeLimit: new BigNumber(1000),
      }
      ethProviderMock.getStakingLimitInfo.mockResolvedValueOnce(E.right(getStakingLimitInfo))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleStakingLimit(blockNumber, currentBlockDate.getTime())

      const expected = Finding.fromObject({
        alertId: 'LOW-STAKING-LIMIT',
        description: `Current staking limit is 250.00 ETH this is lower than 30% of max staking limit 1000.00 ETH`,
        name: '📉 Staking limit below 30%',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)

      expect(srv.getStorage().getLastReportedStakingLimit30Timestamp()).toEqual(currentBlockDate.getTime())
    })
  })

  describe('handleTransaction', () => {
    test('success', async () => {
      const cache = new StethOperationCache()

      const depositEvents = getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS)
      const lidoEvents = getLidoEvents(address.LIDO_STETH_ADDRESS)
      const insuranceFundEvents = getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20)
      const burnerEvents = getBurnerEvents(address.BURNER_ADDRESS)

      const events = [...depositEvents, ...lidoEvents, ...insuranceFundEvents, ...burnerEvents]

      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContractMock,
        wdQueueContractMock,
        depositEvents,
        lidoEvents,
        insuranceFundEvents,
        burnerEvents,
      )

      const txEventMock = TransactionEventContractMock()
      txEventMock.addresses = {
        [address.DEPOSIT_SECURITY_ADDRESS]: true,
        [address.LIDO_STETH_ADDRESS]: true,
        [address.INSURANCE_FUND_ADDRESS]: true,
        [address.BURNER_ADDRESS]: true,
      }

      txEventMock.to = address.DEPOSIT_SECURITY_ADDRESS

      const filteredEvents: LogDescription[] = []
      for (const logDescription of [
        ...getFilteredDepositSecurityEventsMock(),
        ...getFilteredLidoEventsMock(),
        ...getFilteredInsuranceFundEventsMock(),
        ...getFilteredBurnerEventsMock(),
      ]) {
        filteredEvents.push(logDescription)
        txEventMock.filterLog.mockReturnValueOnce([logDescription])
      }

      const result = srv.handleTransaction(txEventMock)

      for (let i = 0; i < result.length; i++) {
        const expected: Finding = Finding.fromObject({
          name: events[i].name,
          description: events[i].description(filteredEvents[i].args),
          alertId: events[i].alertId,
          severity: events[i].severity,
          type: events[i].type,
          metadata: { args: String(filteredEvents[i].args) },
        })

        expect(result[i]).toEqual(expected)
      }
    })
  })
})
