import { BridgeBalanceSrv } from './bridge_balance'
import * as Winston from 'winston'
import { ERC20Short__factory, L2ERC20Bridge__factory } from '../generated'
import { EthClient } from '../clients/eth_provider_client'
import { Address } from '../utils/constants'
import { ethers } from 'forta-agent'
import { ZkSyncClient } from '../clients/zksync_client'
import { expect } from '@jest/globals'

const TEST_TIMEOUT = 120_000 // ms

describe('Bridge balance srv functional tests', () => {
  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const adr = Address

  const mainnet = 1
  const drpcUrl = 'https://eth.drpc.org/'
  const ethProvider = new ethers.providers.FallbackProvider([new ethers.providers.JsonRpcProvider(drpcUrl, mainnet)])

  const wSthEthRunner = ERC20Short__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
  const ethClient = new EthClient(logger, wSthEthRunner)

  const l1ethBlock = 19_811_531
  const l2EthBlocks = [33309095]

  test(
    '🚨🚨🚨 ZkSync bridge balance mismatch https://mainnet.era.zksync.io',
    async () => {
      const zkSyncNetworkID = 324
      const zkSyncRpcURL = 'https://mainnet.era.zksync.io'
      const zkSyncProvider = new ethers.providers.JsonRpcProvider(zkSyncRpcURL, zkSyncNetworkID)

      const zkSyncL2BridgeRunner = L2ERC20Bridge__factory.connect(
        adr.ZKSYNC_L2ERC20_TOKEN_BRIDGE_ADDRESS,
        zkSyncProvider,
      )

      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.ZKSYNC_WSTETH_BRIDGED_ADDRESS, zkSyncProvider)
      const zkSyncClient = new ZkSyncClient(zkSyncProvider, logger, zkSyncL2BridgeRunner, bridgedWSthEthRunner)

      const bridgeBalanceSrv = new BridgeBalanceSrv(
        logger,
        ethClient,
        zkSyncClient,
        adr.ZKSYNC_L1ERC20_TOKEN_BRIDGE_ADDRESS,
      )

      const findings = await bridgeBalanceSrv.handleBlock(l1ethBlock, l2EthBlocks)

      expect(findings.length).toEqual(1)
      expect(findings[0].name).toEqual('🚨🚨🚨 ZkSync bridge balance mismatch 🚨🚨🚨')
    },
    TEST_TIMEOUT,
  )

  test(
    '🚨🚨🚨 ZkSync bridge balance mismatch https://zksync.drpc.org',
    async () => {
      const zkSyncNetworkID = 324
      const zkSyncRpcURL = 'https://zksync.drpc.org'
      const zkSyncProvider = new ethers.providers.JsonRpcProvider(zkSyncRpcURL, zkSyncNetworkID)

      const zkSyncL2BridgeRunner = L2ERC20Bridge__factory.connect(
        adr.ZKSYNC_L2ERC20_TOKEN_BRIDGE_ADDRESS,
        zkSyncProvider,
      )

      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.ZKSYNC_WSTETH_BRIDGED_ADDRESS, zkSyncProvider)
      const zkSyncClient = new ZkSyncClient(zkSyncProvider, logger, zkSyncL2BridgeRunner, bridgedWSthEthRunner)

      const bridgeBalanceSrv = new BridgeBalanceSrv(
        logger,
        ethClient,
        zkSyncClient,
        adr.ZKSYNC_L1ERC20_TOKEN_BRIDGE_ADDRESS,
      )

      const findings = await bridgeBalanceSrv.handleBlock(l1ethBlock, l2EthBlocks)

      expect(findings.length).toEqual(1)
      expect(findings[0].name).toEqual('🚨🚨🚨 ZkSync bridge balance mismatch 🚨🚨🚨')
    },
    TEST_TIMEOUT,
  )
})
