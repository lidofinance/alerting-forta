import { App } from '../app'
import BigNumber from 'bignumber.js'
import { Address, ETH_DECIMALS } from '../utils/constants'
import * as E from 'fp-ts/Either'
import * as Winston from 'winston'
import { ethers } from 'ethers'
import { ERC20Short__factory, L2ERC20TokenBridge__factory } from '../generated'
import { MantleClient } from './mantle_provider'
import { AVG_BLOCK_TIME_2SECONDS, HOURS_48 } from '../services/monitor_withdrawals'
import { expect } from '@jest/globals'

const timeout = 120_000

describe('MantleProvider', () => {
  test(
    'fetchBlocks',
    async () => {
      const app = await App.getInstance()

      const start = 50_183_000
      const end = 50_184_000
      const blocks = await app.mantleClient.fetchL2Blocks(start, end)

      expect(blocks.length).toEqual(end - start + 1)
    },
    timeout,
  )

  test(
    'getWstEthTotalSupply is 9.860230303930711579 wsETH',
    async () => {
      const app = await App.getInstance()

      const baseBlockNumber = 62_393_461
      const balance = await app.mantleClient.getWstEthTotalSupply(baseBlockNumber)
      if (E.isLeft(balance)) {
        throw balance.left
      }

      expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('9.860230303930711579'))
    },
    timeout,
  )

  test(
    'getWithdrawalEvents fetches 86_401 blocks for getting withdrawal events',
    async () => {
      const adr = Address

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const mantleRpcURL = 'https://rpc.mantle.xyz'

      const baseNetworkID = 5000
      const mantleProvider = new ethers.providers.JsonRpcProvider(mantleRpcURL, baseNetworkID)

      const l2Bridge = L2ERC20TokenBridge__factory.connect(adr.MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS, mantleProvider)
      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.MANTLE_WSTETH_ADDRESS, mantleProvider)
      const mantleClient = new MantleClient(mantleProvider, logger, l2Bridge, bridgedWSthEthRunner)

      const currentBlock = 64_170_875

      const pastBlock = currentBlock - Math.ceil(HOURS_48 / AVG_BLOCK_TIME_2SECONDS)

      expect(86401).toEqual(currentBlock - pastBlock + 1)

      const withdrawalEvents = await mantleClient.getWithdrawalEvents(pastBlock, currentBlock - 1)
      if (E.isLeft(withdrawalEvents)) {
        throw withdrawalEvents
      }

      expect(withdrawalEvents.right.length).toEqual(2)
    },
    timeout,
  )
})
