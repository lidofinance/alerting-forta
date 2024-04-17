import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { IProxyWatcherClient } from './contract'
import { ProxyWatcherSrv } from './ProxyWatcher.srv'
import { BlockEvent, FindingSeverity } from 'forta-agent'
import * as constants from '../../shared/constants/proxy-watcher/mainnet'
import { implementationFuncShortABI } from '../../shared/constants/proxy-watcher/mainnet'
import { IProxyContractData, LIDO_STETH_ADDRESS as lidoStethAddress } from '../../shared/constants/common/mainnet'
import { faker } from '@faker-js/faker'
import { etherscanAddress } from '../../shared/string'
import { expect } from '@jest/globals'

describe('ProxyWatcherSrv', () => {
  let logger: Logger
  let ethProvider: IProxyWatcherClient
  let proxyWatcherSrv: ProxyWatcherSrv
  let blockEvent: BlockEvent
  let dataName: string

  beforeEach(() => {
    logger = { info: jest.fn() } as unknown as Logger
    ethProvider = { isDeployed: jest.fn(), getProxyImplementation: jest.fn() } as unknown as IProxyWatcherClient
    proxyWatcherSrv = new ProxyWatcherSrv(logger, ethProvider)
    blockEvent = { blockNumber: 100 } as BlockEvent

    dataName = faker.music.songName()
    jest.mock('../../shared/constants/proxy-watcher/mainnet')
    jest.mocked(constants).LIDO_PROXY_CONTRACTS_DATA = new Map<string, IProxyContractData>([
      [
        lidoStethAddress,
        {
          name: dataName,
          shortABI: implementationFuncShortABI,
        },
      ],
    ]) as never
    jest.spyOn(ethProvider, 'isDeployed').mockResolvedValue(E.right(true))
  })

  it('initializes without errors', async () => {
    jest.spyOn(ethProvider, 'getProxyImplementation').mockResolvedValue(E.right(['0x1234']))
    jest.spyOn(proxyWatcherSrv, 'handleProxyImplementations').mockResolvedValue([])

    await proxyWatcherSrv.initialize(100)

    await expect(proxyWatcherSrv.handleBlock(blockEvent)).resolves.toEqual([])
  })

  it('initializes with network error', async () => {
    jest.spyOn(ethProvider, 'getProxyImplementation').mockResolvedValue(E.left(new Error('Network error')))
    jest.spyOn(proxyWatcherSrv, 'handleProxyImplementations').mockResolvedValue([])
    await proxyWatcherSrv.initialize(100)

    const findings = await proxyWatcherSrv.handleBlock(blockEvent)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      name: 'Error in ProxyWatcherSrv.initialize (uid:bdbd1548)',
      description: `Could not call ethProvider.getCode for address - ${lidoStethAddress}`,
      alertId: 'NETWORK-ERROR',
    })
  })

  it('initializes but proxy contract not found', async () => {
    jest.spyOn(ethProvider, 'isDeployed').mockResolvedValue(E.right(false))
    jest.spyOn(ethProvider, 'getProxyImplementation').mockResolvedValue(E.right(['0x1234']))
    await proxyWatcherSrv.initialize(100)

    const findings = await proxyWatcherSrv.handleBlock(blockEvent)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      name: '🚨 Proxy contract not found',
      description: `Proxy contract ${dataName} ([${lidoStethAddress}](https://etherscan.io/address/${lidoStethAddress})) not found`,
      alertId: 'PROXY-NOT-FOUND',
      severity: FindingSeverity.Critical,
    })
  })

  it('returns the correct name', () => {
    expect(proxyWatcherSrv.getName()).toBe('ProxyWatcherSrv')
  })

  it('handles block without error', async () => {
    jest.spyOn(proxyWatcherSrv, 'handleProxyImplementations').mockResolvedValue([])

    await expect(proxyWatcherSrv.handleBlock(blockEvent)).resolves.toEqual([])
  })

  it('handles proxy implementations without error', async () => {
    jest.spyOn(ethProvider, 'getProxyImplementation').mockResolvedValue(E.right(['0x1234']))
    await proxyWatcherSrv.handleProxyImplementations(blockEvent) // add to prevProxyImplementations

    await expect(proxyWatcherSrv.handleProxyImplementations(blockEvent)).resolves.toEqual([])
  })

  it('handles proxy contract self destruction', async () => {
    jest.spyOn(ethProvider, 'isDeployed').mockResolvedValue(E.right(false))

    await expect(proxyWatcherSrv.handleProxyImplementations(blockEvent)).resolves.toMatchObject([
      {
        name: '🚨 Proxy contract selfdestructed',
        description: `Proxy contract ${dataName} ([${lidoStethAddress}](https://etherscan.io/address/${lidoStethAddress})) selfdestructed`,
        alertId: 'PROXY-SELFDESTRUCTED',
        severity: FindingSeverity.Critical,
      },
    ])
  })

  it('handles proxy contract self destruction only once per address', async () => {
    jest.spyOn(ethProvider, 'isDeployed').mockResolvedValue(E.right(false))
    await proxyWatcherSrv.handleProxyImplementations(blockEvent) // handle error add address to proxiesNoCode

    await expect(proxyWatcherSrv.handleProxyImplementations(blockEvent)).resolves.toEqual([]) // second call should not add a finding
  })

  it('handles proxy contract change', async () => {
    jest
      .spyOn(ethProvider, 'getProxyImplementation')
      .mockResolvedValueOnce(E.right(['0x1234'])) // first call
      .mockResolvedValueOnce(E.right(['0x5678'])) // second call
    await proxyWatcherSrv.handleProxyImplementations(blockEvent) // add to prevProxyImplementations

    await expect(proxyWatcherSrv.handleProxyImplementations(blockEvent)).resolves.toMatchObject([
      {
        name: '🚨 Proxy implementation changed',
        description: `Implementation of ${dataName} ([${lidoStethAddress}](https://etherscan.io/address/${lidoStethAddress})) changed from ${etherscanAddress('0x1234')} to ${etherscanAddress('0x5678')}`,
        alertId: 'PROXY-IMPL-CHANGED',
        severity: FindingSeverity.Critical,
      },
    ])
  })

  it('handles proxy contract change with network error', async () => {
    jest
      .spyOn(ethProvider, 'getProxyImplementation')
      .mockResolvedValueOnce(E.right(['0x1234'])) // first call
      .mockResolvedValueOnce(E.left(new Error('Network error'))) // second call
    await proxyWatcherSrv.handleProxyImplementations(blockEvent) // add to prevProxyImplementations

    await expect(proxyWatcherSrv.handleProxyImplementations(blockEvent)).resolves.toMatchObject([
      {
        name: 'Error in ProxyWatcherSrv.handleProxyImplementations (uid:bdbd1548)',
        description: `Could not call ethProvider.getCode for address - ${lidoStethAddress}`,
        alertId: 'NETWORK-ERROR',
      },
    ])
  })
})
