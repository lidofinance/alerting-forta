import { OssifiableProxy__factory } from '../generated/typechain'
import { Address } from '../utils/constants'
import { ethers } from 'ethers'
import { Config } from '../utils/env/env'
import * as promClient from 'prom-client'
import * as E from 'fp-ts/Either'
import { Metrics } from '../utils/metrics/metrics'
import { ProxyContractClient } from './proxy_contract_client'

const TEST_TIMEOUT = 120_000

describe('ProxyContractClient', () => {
  const config = new Config()
  const adr: Address = Address

  const arbitrumProvider = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.arbChainID)

  const l2BlockNumber = 121_951_308

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister)

  const wstProxy = new ProxyContractClient(
    adr.ARBITRUM_WSTETH_BRIDGED.name,
    OssifiableProxy__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, arbitrumProvider),
    metrics,
  )

  const l2TokenGateway = new ProxyContractClient(
    adr.ARBITRUM_L2_TOKEN_GATEWAY.name,
    OssifiableProxy__factory.connect(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, arbitrumProvider),
    metrics,
  )

  test(
    'getProxyAdmin wst - 0x1dcA41859Cd23b526CBe74dA8F48aC96e14B1A29',
    async () => {
      const proxyAdmin = await wstProxy.getProxyAdmin(l2BlockNumber)
      if (E.isLeft(proxyAdmin)) {
        throw proxyAdmin.left
      }

      expect(proxyAdmin.right).toEqual('0x1dcA41859Cd23b526CBe74dA8F48aC96e14B1A29')
    },
    TEST_TIMEOUT,
  )

  test(
    'getProxyImplementation wst - 0x0fBcbaEA96Ce0cF7Ee00A8c19c3ab6f5Dc8E1921',
    async () => {
      const proxyImpl = await wstProxy.getProxyImplementation(l2BlockNumber)
      if (E.isLeft(proxyImpl)) {
        throw proxyImpl.left
      }

      expect(proxyImpl.right).toEqual('0x0fBcbaEA96Ce0cF7Ee00A8c19c3ab6f5Dc8E1921')
    },
    TEST_TIMEOUT,
  )

  test(
    'getProxyAdmin l2TokenGateway - 0x1dcA41859Cd23b526CBe74dA8F48aC96e14B1A29',
    async () => {
      const proxyAdmin = await l2TokenGateway.getProxyAdmin(l2BlockNumber)
      if (E.isLeft(proxyAdmin)) {
        throw proxyAdmin.left
      }

      expect(proxyAdmin.right).toEqual('0x1dcA41859Cd23b526CBe74dA8F48aC96e14B1A29')
    },
    TEST_TIMEOUT,
  )

  test(
    'getProxyImplementation l2TokenGateway - 0xe75886DE20dF66827e321EfdB88726e6Baa4b0A7',
    async () => {
      const proxyImpl = await l2TokenGateway.getProxyImplementation(l2BlockNumber)
      if (E.isLeft(proxyImpl)) {
        throw proxyImpl.left
      }

      expect(proxyImpl.right).toEqual('0xe75886DE20dF66827e321EfdB88726e6Baa4b0A7')
    },
    TEST_TIMEOUT,
  )
})
