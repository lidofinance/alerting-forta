import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS } from '../utils/constants'
import BigNumber from 'bignumber.js'
import { AVG_BLOCK_TIME_2SECONDS, HOURS_12 } from '../services/monitor_withdrawals'
import { App } from '../app'
import * as Winston from 'winston'
import { ethers } from 'forta-agent'
import { ERC20Short__factory, L2Bridge__factory } from '../generated'
import { BaseClient } from './base_client'

const timeout = 120_000

describe('base provider tests', () => {
  const app = App.getInstance()

  test(
    'should fetch block logs',
    async () => {
      const latestBlock = await app.baseClient.getLatestL2Block()
      if (E.isLeft(latestBlock)) {
        throw latestBlock
      }

      const blocksDto = await app.baseClient.getL2Logs(latestBlock.right.number, latestBlock.right.number)
      if (E.isLeft(blocksDto)) {
        throw blocksDto
      }

      expect(blocksDto.right.length).toBeGreaterThan(1)
    },
    timeout,
  )

  test(
    'getWithdrawalEvents fetches 21_601 blocks for getting withdrawal events',
    async () => {
      const currentBlock = 15_091_860

      const pastBlock = currentBlock - Math.ceil(HOURS_12 / AVG_BLOCK_TIME_2SECONDS)

      expect(21_601).toEqual(currentBlock - pastBlock + 1)

      const withdrawalEvents = await app.baseClient.getWithdrawalEvents(pastBlock, currentBlock - 1)
      if (E.isLeft(withdrawalEvents)) {
        throw withdrawalEvents
      }

      expect(withdrawalEvents.right.length).toEqual(0)
    },
    timeout,
  )

  test(
    'getWstEthTotalSupply is 16388.426826708573275643 wsETH',
    async () => {
      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const baseNetworkID = 8453
      const defaultL2RPCURL = 'https://base.drpc.org'

      const baseProvider = new ethers.providers.JsonRpcProvider(defaultL2RPCURL, baseNetworkID)
      const adr: Address = Address

      const l2Bridge = L2Bridge__factory.connect(adr.BASE_L2ERC20_TOKEN_BRIDGE_ADDRESS, baseProvider)
      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.BASE_WSTETH_ADDRESS, baseProvider)
      const baseClient = new BaseClient(baseProvider, l2Bridge, logger, bridgedWSthEthRunner)

      const baseBlockNumber = 15_091_860
      const balance = await baseClient.getWstEthTotalSupply(baseBlockNumber)
      if (E.isLeft(balance)) {
        throw balance.left
      }

      expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('16388.426826708573275643'))
    },
    timeout,
  )
})
