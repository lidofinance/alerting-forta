import { StethOperationSrv } from './services/steth_operation/StethOperation.srv'
import { ethers, getEthersProvider } from 'forta-agent'
import {
  DEPOSIT_EXECUTOR_ADDRESS,
  DEPOSIT_SECURITY_ADDRESS,
  LIDO_STETH_ADDRESS,
  WITHDRAWAL_QUEUE_ADDRESS,
} from './utils/constants'
import { StethOperationCache } from './services/steth_operation/StethOperation.cache'
import { ETHProvider, IETHProvider } from './clients/eth_provider'
import { FormatterWithEIP1898 } from './clients/eth_formatter'
import { Lido__factory, WithdrawalQueueERC721__factory } from './generated'
import { DEPOSIT_SECURITY_EVENTS } from './utils/events/deposit_security_events'
import { LIDO_EVENTS } from './utils/events/lido_events'
import { INSURANCE_FUND_EVENTS } from './utils/events/insurance_fund_events'
import { BURNER_EVENTS } from './utils/events/burner_events'

export type Container = {
  ethClient: IETHProvider
  StethOperationSrv: StethOperationSrv
}

export class App {
  private static instance: Container

  private constructor() {}

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const etherscanKey = Buffer.from('SVZCSjZUSVBXWUpZSllXSVM0SVJBSlcyNjRITkFUUjZHVQ==', 'base64').toString('utf-8')

      const etherscanProvider = new ethers.providers.EtherscanProvider(
        process.env.FORTA_AGENT_RUN_TIER == 'testnet' ? 'goerli' : undefined,
        etherscanKey,
      )

      const ethersProvider = getEthersProvider()
      ethersProvider.formatter = new FormatterWithEIP1898()

      const ethClient = new ETHProvider(ethersProvider, etherscanProvider)

      const lidoContact = Lido__factory.connect(LIDO_STETH_ADDRESS, ethersProvider)
      const wdQueueContact = WithdrawalQueueERC721__factory.connect(WITHDRAWAL_QUEUE_ADDRESS, ethersProvider)

      const stethOperationCache = new StethOperationCache()
      const stethOperationSrv = new StethOperationSrv(
        stethOperationCache,
        ethClient,
        DEPOSIT_SECURITY_ADDRESS,
        LIDO_STETH_ADDRESS,
        DEPOSIT_EXECUTOR_ADDRESS,
        lidoContact,
        wdQueueContact,
        DEPOSIT_SECURITY_EVENTS,
        LIDO_EVENTS,
        INSURANCE_FUND_EVENTS,
        BURNER_EVENTS,
      )

      App.instance = {
        ethClient: ethClient,
        StethOperationSrv: stethOperationSrv,
      }
    }

    return App.instance
  }
}