import { ProxyShortABI__factory } from '../generated/typechain'
import { Address } from '../utils/constants'
import { ethers } from 'forta-agent'
import { Config } from '../utils/env/env'
import promClient from 'prom-client'
import * as E from 'fp-ts/Either'
import { Metrics } from '../utils/metrics/metrics'
import { ProxyContractClient } from './proxy_contract_client'

const TEST_TIMEOUT = 120_000

describe('ProxyContractClient', () => {
  const config = new Config()
  const adr: Address = Address

  const optimismProvider = new ethers.providers.JsonRpcProvider(config.optimismRpcUrl, config.chainId)

  const l2BlockNumber = 121_951_308

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister, config.promPrefix)

  const wstProxy = new ProxyContractClient(
    adr.OPTIMISM_WSTETH_BRIDGED.name,
    ProxyShortABI__factory.connect(adr.OPTIMISM_WSTETH_BRIDGED.address, optimismProvider),
    metrics,
  )

  const l2TokenGateway = new ProxyContractClient(
    adr.OPTIMISM_L2_TOKEN_GATEWAY.name,
    ProxyShortABI__factory.connect(adr.OPTIMISM_L2_TOKEN_GATEWAY.address, optimismProvider),
    metrics,
  )

  test(
    'getProxyAdmin wst - 0xEfa0dB536d2c8089685630fafe88CF7805966FC3',
    async () => {
      const proxyAdmin = await wstProxy.getProxyAdmin(l2BlockNumber)
      if (E.isLeft(proxyAdmin)) {
        throw proxyAdmin.left
      }

      expect(proxyAdmin.right).toEqual('0xEfa0dB536d2c8089685630fafe88CF7805966FC3')
    },
    TEST_TIMEOUT,
  )

  test(
    'getProxyImplementation wst - 0x92834c37dF982A13bb0f8C3F6608E26F0546538e',
    async () => {
      const proxyImpl = await wstProxy.getProxyImplementation(l2BlockNumber)
      if (E.isLeft(proxyImpl)) {
        throw proxyImpl.left
      }

      expect(proxyImpl.right).toEqual('0x92834c37dF982A13bb0f8C3F6608E26F0546538e')
    },
    TEST_TIMEOUT,
  )

  test(
    'getProxyAdmin l2TokenGateway - 0xEfa0dB536d2c8089685630fafe88CF7805966FC3',
    async () => {
      const proxyAdmin = await l2TokenGateway.getProxyAdmin(l2BlockNumber)
      if (E.isLeft(proxyAdmin)) {
        throw proxyAdmin.left
      }

      expect(proxyAdmin.right).toEqual('0xEfa0dB536d2c8089685630fafe88CF7805966FC3')
    },
    TEST_TIMEOUT,
  )

  test(
    'getProxyImplementation l2TokenGateway - 0x23B96aDD54c479C6784Dd504670B5376B808f4C7',
    async () => {
      const proxyImpl = await l2TokenGateway.getProxyImplementation(l2BlockNumber)
      if (E.isLeft(proxyImpl)) {
        throw proxyImpl.left
      }

      expect(proxyImpl.right).toEqual('0x23B96aDD54c479C6784Dd504670B5376B808f4C7')
    },
    TEST_TIMEOUT,
  )
})
