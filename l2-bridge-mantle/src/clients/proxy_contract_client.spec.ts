import { ProxyContractClient } from './proxy_contract_client'
import { ERC20Short__factory, L2ERC20TokenBridge__factory, OssifiableProxy__factory } from '../generated'
import { Address } from '../utils/constants'
import * as Winston from 'winston'
import { ethers } from 'ethers'
import * as E from 'fp-ts/Either'
import { MantleClient } from './mantle_provider'
import { expect } from '@jest/globals'

const timeout = 120_000

describe('Proxy_watcher tests', () => {
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

  test(
    'test MANTLE_L2ERC20_TOKEN_BRIDGED proxy client',
    async () => {
      const latestL2Block = await mantleClient.getLatestL2Block()
      if (E.isLeft(latestL2Block)) {
        throw latestL2Block.left
      }

      const client = new ProxyContractClient(
        adr.MANTLE_L2ERC20_TOKEN_BRIDGED.name,
        adr.MANTLE_L2ERC20_TOKEN_BRIDGED.address,
        OssifiableProxy__factory.connect(adr.MANTLE_L2ERC20_TOKEN_BRIDGED.address, mantleProvider),
      )

      const proxyImpl = await client.getProxyImplementation(latestL2Block.right.number)
      if (E.isLeft(proxyImpl)) {
        throw proxyImpl.left
      }

      expect(proxyImpl.right).toEqual('0xf10A7ffC613a9b23Abc36167925A375bf5986181')

      const proxyAdm = await client.getProxyAdmin(latestL2Block.right.number)
      if (E.isLeft(proxyAdm)) {
        throw proxyAdm.left
      }

      expect(proxyAdm.right).toEqual('0x3a7B055BF88CdC59D20D0245809C6E6B3c5819dd')
    },
    timeout,
  )

  test(
    'test MANTLE_WSTETH_BRIDGED proxy client',
    async () => {
      const latestL2Block = await mantleClient.getLatestL2Block()
      if (E.isLeft(latestL2Block)) {
        throw latestL2Block.left
      }

      const client = new ProxyContractClient(
        adr.MANTLE_WSTETH_BRIDGED.name,
        adr.MANTLE_WSTETH_BRIDGED.address,
        OssifiableProxy__factory.connect(adr.MANTLE_WSTETH_BRIDGED.address, mantleProvider),
      )

      const proxyImpl = await client.getProxyImplementation(latestL2Block.right.number)
      if (E.isLeft(proxyImpl)) {
        throw proxyImpl.left
      }

      expect(proxyImpl.right).toEqual('0x1FaBaAec88198291A4efCc85Cabb33a3785165ba')

      const proxyAdm = await client.getProxyAdmin(latestL2Block.right.number)
      if (E.isLeft(proxyAdm)) {
        throw proxyAdm.left
      }

      expect(proxyAdm.right).toEqual('0x3a7B055BF88CdC59D20D0245809C6E6B3c5819dd')
    },
    timeout,
  )
})
