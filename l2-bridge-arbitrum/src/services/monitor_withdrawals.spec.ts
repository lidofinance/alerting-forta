import { ArbERC20__factory, ERC20Bridged__factory, L2ERC20TokenGateway__factory } from '../generated/typechain'
import { Address } from '../utils/constants'
import { ethers } from 'ethers'
import { Config } from '../utils/env/env'
import promClient from 'prom-client'
import { Metrics } from '../utils/metrics/metrics'
import { MonitorWithdrawals } from './monitor_withdrawals'
import { TransactionDto } from '../entity/events'
import { ArbitrumClient } from '../clients/arbitrum_client'
import * as Winston from 'winston'
import BigNumber from 'bignumber.js'
import { WithdrawalRecord } from '../entity/blockDto'

const TEST_TIMEOUT = 120_000

describe('monitor_withdrawals', () => {
  const config = new Config()
  const adr: Address = Address

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  const arbitrumProvider = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.chainId)

  const l2Bridge = L2ERC20TokenGateway__factory.connect(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, arbitrumProvider)
  const bridgedWSthEthRunner = ERC20Bridged__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, arbitrumProvider)
  const bridgedLdoRunner = ArbERC20__factory.connect(adr.ARBITRUM_LDO_BRIDGED_ADDRESS, arbitrumProvider)

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister, config.promPrefix)
  const l2Client = new ArbitrumClient(arbitrumProvider, metrics, l2Bridge, bridgedWSthEthRunner, bridgedLdoRunner)

  const withdrawalsSrv = new MonitorWithdrawals(l2Client, adr.ARBITRUM_L2_TOKEN_GATEWAY.address, logger)

  test(
    'handleTransaction is 1.732302579999414411',
    async () => {
      const trx = await arbitrumProvider.getTransaction(
        '0x1a2c17ed5ba462c26e8a1797f3a1f99a7708e659ddf033c46e95dd3f240fe883',
      )

      const receipt = await trx.wait()
      const block = await arbitrumProvider.getBlock(receipt.blockHash)

      const logs = await arbitrumProvider.getLogs({
        blockHash: '0xb713ad11db2444ea29b823d84c8480c6fe7e478f307f59b070a835ad9f114f73',
      })

      const trxDto: TransactionDto = {
        logs: logs,
        to: trx.to ? trx.to.toLowerCase() : null,
        block: {
          number: new BigNumber(block.number, 10).toNumber(),
          timestamp: block.timestamp,
        },
      }

      const withdrawalRecord = withdrawalsSrv.handleTransaction(trxDto)
      if (withdrawalRecord === null) {
        throw new Error('Could not parse log')
      }

      const expectedAmount = new BigNumber('1732302579999414411')

      const expected: WithdrawalRecord = {
        timestamp: block.timestamp,
        amount: expectedAmount,
      }

      expect(withdrawalRecord).toEqual(expected)
    },
    TEST_TIMEOUT,
  )
})
