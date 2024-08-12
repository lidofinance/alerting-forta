import { expect } from '@jest/globals'
import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import { either as E } from 'fp-ts'
import * as promClient from 'prom-client'
import * as Winston from 'winston'
import {
  GateSeal__factory,
  Lido__factory,
  ValidatorsExitBusOracle__factory,
  WithdrawalQueueERC721__factory,
} from '../generated/typechain'
import { HISTORY_BLOCK_OFFSET } from '../services/steth_operation/StethOperation.srv'
import {
  Address,
  ETH_DECIMALS,
  SLOT_ACCOUNTING_HASH_CONSENSUS_FRAME_CONFIG,
  SLOT_ACCOUNTING_HASH_CONSENSUS_MEMBER_ADDRESSES,
  SLOT_ACCOUNTING_HASH_CONSENSUS_QUORUM,
  SLOT_ACCOUNTING_HASH_CONSENSUS_REPORT_PROCESSOR,
  SLOT_ACCOUNTING_ORACLE_CONSENSUS_CONTRACT,
  SLOT_ACCOUNTING_ORACLE_CONSENSUS_VERSION,
  SLOT_ACCOUNTING_ORACLE_VERSIONED_CONTRACT_VERSION,
  SLOT_ARAGON_FINANCE_VAULT,
  SLOT_ARAGON_MANAGER_MAX_ACCOUNT_TOKENS,
  SLOT_ARAGON_MANAGER_TOKEN,
  SLOT_ARAGON_OBJECTION_PHASE_TIME,
  SLOT_ARAGON_SUPPORT_REQUIRED_PCT,
  SLOT_ARAGON_TOKEN,
  SLOT_DSM_GUARDIANS,
  SLOT_DSM_HASH_MAX_DEPOSITS_PER_BLOCK,
  SLOT_DSM_HASH_MIN_DEPOSIT_BLOCK_DISTANCE,
  SLOT_DSM_HASH_PAUSE_INTENT_VALIDITY_PERIOD_BLOCKS,
  SLOT_DSM_OWNER,
  SLOT_DSM_QUORUM,
  SLOT_DVT_LOCATOR,
  SLOT_DVT_STUCK_PENALTY_DELAY,
  SLOT_DVT_TYPE,
  SLOT_LEGACY_ORACLE_ACCOUNTING_ORACLE,
  SLOT_LEGACY_ORACLE_BEACON_SPEC,
  SLOT_LEGACY_ORACLE_CONTRACT_VERSION,
  SLOT_LEGACY_ORACLE_LIDO,
  SLOT_LEGACY_ORACLE_VERSIONED_CONTRACT_VERSION,
  SLOT_LIDO_INSURANCE_OWNER,
  SLOT_LIDO_LOCATOR,
  SLOT_LIDO_TREASURY_DESIGNATED_SIGNER,
  SLOT_LIDO_VERSIONED_CONTRACT,
  SLOT_MEV_BOOST_ALLOWED_LIST,
  SLOT_MEV_BOOST_MANAGER,
  SLOT_MEV_BOOST_OWNER,
  SLOT_NOR_LOCATOR,
  SLOT_NOR_STUCK_PENALTY_DELAY,
  SLOT_NOR_TYPE,
  SLOT_STAKING_ROUTER_VERSIONED_CONTRACT_VERSION,
  SLOT_VEBO_CONSENSUS_CONTRACT,
  SLOT_VEBO_HASH_CONSENSUS_FRAME_CONFIG,
  SLOT_VEBO_HASH_CONSENSUS_MEMBER_ADDRESSES,
  SLOT_VEBO_HASH_CONSENSUS_QUORUM,
  SLOT_VEBO_HASH_CONSENSUS_REPORT_PROCESSOR,
  SLOT_VEBO_ORACLE_CONSENSUS_VERSION,
  SLOT_VEBO_VERSIONED_CONTRACT_VERSION,
  SLOT_WITHDRAWALS_QUEUE_BASE_URI,
  SLOT_WITHDRAWALS_QUEUE_BUNKER_MODE_SINCE_TIMESTAMP,
  SLOT_WITHDRAWALS_QUEUE_NFT_DESCRIPTOR_ADDRESS,
  SLOT_WITHDRAWALS_QUEUE_VERSIONED_CONTRACT_VERSION,
  SLOT_WSTETH,
  SLOTS_STAKING_ROUTER_LAST_STAKING_MODULE_ID,
  SLOTS_STAKING_ROUTER_LIDO,
  SLOTS_STAKING_ROUTER_STAKING_MODULES_COUNT,
  SLOTS_STAKING_ROUTER_WITHDRAWAL_CREDENTIALS,
} from '../utils/constants'
import { Metrics } from '../utils/metrics/metrics'
import { ETHProvider } from './eth_provider'

describe('eth provider tests', () => {
  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })
  const address: Address = Address
  const chainId = 1

  const fortaEthersProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, chainId)
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, fortaEthersProvider)
  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, fortaEthersProvider)
  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, fortaEthersProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.VEBO_ADDRESS, fortaEthersProvider)

  const defaultRegistry = promClient
  const prefix = 'test_'
  defaultRegistry.collectDefaultMetrics({
    prefix: prefix,
  })

  const registry = new promClient.Registry()
  const metrics = new Metrics(registry, prefix)

  const ethClient = new ETHProvider(
    logger,
    metrics,
    fortaEthersProvider,
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    veboRunner,
  )

  test('getWithdrawalStatuses should return 1750 withdrawal statuses', async () => {
    const blockNumber = 19112800
    const requestsRange: number[] = []
    for (let i = 21001; i <= 22750; i++) {
      requestsRange.push(i)
    }

    const statuses = await ethClient.getWithdrawalStatuses(requestsRange, blockNumber)
    if (E.isLeft(statuses)) {
      throw statuses.left.message
    }

    expect(statuses.right.length).toEqual(1750)
  }, 120_000)

  test('getBalanceByBlockHash is 16619.29059680177', async () => {
    const blockNumber = 19_140_476
    const block = await fortaEthersProvider.getBlock(blockNumber)
    const parentBlockHash = '0x55fdadee696dd3b08c0752c2fa5feba7abd19992fd3d2f18f9a87baa62fa34ae'
    expect(block.parentHash).toEqual(parentBlockHash)

    const parentBlock = await fortaEthersProvider.getBlock(parentBlockHash)
    expect(parentBlock.number).toEqual(blockNumber - 1)
    const resp = await ethClient.getBalanceByBlockHash(Address.WITHDRAWALS_QUEUE_ADDRESS, block.parentHash)

    if (E.isLeft(resp)) {
      throw resp.left.message
    }

    const resp2 = new BigNumber(
      (await fortaEthersProvider.getBalance(Address.WITHDRAWALS_QUEUE_ADDRESS, blockNumber - 1)).toString(),
    )

    const expectedBalance = 16619.29059680177
    expect(resp.right.dividedBy(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
    expect(resp2.div(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
  }, 120_000)

  test('getBalanceByBlockHash is 38186.88677324665', async () => {
    const blockNumber = 19_619_102
    const block = await fortaEthersProvider.getBlock(blockNumber)
    const parentBlockHash = '0x0667f8c4447dfcac0f667cd1c6dbb2b5a6dfed35a051a44d8f512710191938a9'
    expect(block.parentHash).toEqual(parentBlockHash)

    const parentBlock = await fortaEthersProvider.getBlock(parentBlockHash)
    expect(parentBlock.number).toEqual(blockNumber - 1)
    const resp = await ethClient.getBalanceByBlockHash(Address.WITHDRAWALS_QUEUE_ADDRESS, block.parentHash)

    if (E.isLeft(resp)) {
      throw resp.left.message
    }

    const resp2 = new BigNumber(
      (await fortaEthersProvider.getBalance(Address.WITHDRAWALS_QUEUE_ADDRESS, blockNumber - 1)).toString(),
    )

    const expectedBalance = 38186.88677324665
    expect(resp.right.dividedBy(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
    expect(resp2.div(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
  }, 120_000)

  test('getShareRate is 1.16583492875463847628', async () => {
    const blockNumber = 19_811_012
    const shareRate = await ethClient.getShareRate(blockNumber)
    if (E.isLeft(shareRate)) {
      throw shareRate.left.message
    }

    expect('1.16583492875463847628').toEqual(shareRate.right.toString())
  }, 120_000)

  test('getBlock by hash', async () => {
    const blockHash = `0x0b99aebc4925ff127f1368b4aafff11dacc051a24247c0ee4159b735ca300d49`
    const block = await ethClient.getBlockByHash(blockHash)
    if (E.isLeft(block)) {
      throw block.left.message
    }

    expect(20_160_727).toEqual(block.right.number)
  }, 120_000)

  test('getBufferedEther by blockNumber', async () => {
    const blockNumber = 20_160_727
    const bufferedEther = await ethClient.getBufferedEther(blockNumber)
    if (E.isLeft(bufferedEther)) {
      throw bufferedEther.left.message
    }

    expect(6016.430655102903).toEqual(bufferedEther.right.dividedBy(ETH_DECIMALS).toNumber())
  }, 120_000)

  test('getChainBlocks by hash', async () => {
    const parentHash = `0x0b99aebc4925ff127f1368b4aafff11dacc051a24247c0ee4159b735ca300d49`
    const chain = await ethClient.getChainPrevBlocks(parentHash, 4)
    if (E.isLeft(chain)) {
      throw chain.left.message
    }

    expect(chain.right[3].hash).toEqual(parentHash)
    expect(chain.right[0].number).toEqual(20_160_724)
    expect(chain.right[1].number).toEqual(20_160_725)
    expect(chain.right[2].number).toEqual(20_160_726)
    expect(chain.right[3].number).toEqual(20_160_727)

    expect(chain.right[0].hash).toEqual(chain.right[1].parentHash)
    expect(chain.right[1].hash).toEqual(chain.right[2].parentHash)
    expect(chain.right[2].hash).toEqual(chain.right[3].parentHash)
  }, 120_000)

  test('getETHDistributedEvent', async () => {
    const currBlock = 20_211_671
    const events = await ethClient.getETHDistributedEvents(currBlock, currBlock)
    if (E.isLeft(events)) {
      throw events.left.message
    }

    expect(events.right.length).toEqual(1)
  }, 120_000)

  test('getUnbufferedEvents', async () => {
    const currBlock = 20_212_690
    const events = await ethClient.getUnbufferedEvents(currBlock - HISTORY_BLOCK_OFFSET, currBlock)
    if (E.isLeft(events)) {
      throw events.left.message
    }

    const latestDepositBlock = await ethClient.getBlockByNumber(events.right[events.right.length - 1].blockNumber)
    if (E.isLeft(latestDepositBlock)) {
      throw latestDepositBlock.left
    }

    const expectedBlockNumber = 20190032
    const expectedTimestamp = 1719575867

    expect(latestDepositBlock.right.number).toEqual(expectedBlockNumber)
    expect(latestDepositBlock.right.timestamp).toEqual(expectedTimestamp)
  }, 120_000)

  test('getStethBalance', async () => {
    const currBlock = 20_218_548

    const stBalance = await ethClient.getStethBalance(address.LIDO_STETH_ADDRESS, currBlock)
    if (E.isLeft(stBalance)) {
      throw stBalance.left.message
    }

    expect(stBalance.right.div(ETH_DECIMALS).toNumber()).toEqual(13.292691238482098)
  }, 120_000)

  // Test storage watcher network methods
  // https://etherscan.io/block/20511417
  const blockHash = `0x1288eb76fb9f6123cf893484011fe6cceb7770de19a3aa4fc63d84210dbf602f`
  const slotId = 777 // for test purposes id does not matter

  test('getStorageByName lido locator', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.LIDO_STETH_ADDRESS,
      slotId,
      'lido.Lido.lidoLocator',
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000c1d0b3de6792bf6b4b37eccdcc24e45978cfd2eb')
  }, 120_000)

  test('getStorageByName lido locator', async () => {
    const blockHash = `0x0b99aebc4925ff127f1368b4aafff11dacc051a24247c0ee4159b735ca300d49`

    const data = await ethClient.getStorageBySlotName(address.LIDO_STETH_ADDRESS, slotId, SLOT_LIDO_LOCATOR, blockHash)
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000c1d0b3de6792bf6b4b37eccdcc24e45978cfd2eb')
  }, 120_000)

  test('getStorageByName lido contractVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.LIDO_STETH_ADDRESS,
      slotId,
      SLOT_LIDO_VERSIONED_CONTRACT,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000002')
  }, 120_000)

  test('getStorageByName NOR lidoLocator', async () => {
    const data = await ethClient.getStorageBySlotName(address.NOR_ADDRESS, slotId, SLOT_NOR_LOCATOR, blockHash)
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000c1d0b3de6792bf6b4b37eccdcc24e45978cfd2eb')
  }, 120_000)

  test('getStorageByName NOR penalty delay', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.NOR_ADDRESS,
      slotId,
      SLOT_NOR_STUCK_PENALTY_DELAY,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000069780')
  }, 120_000)

  test('getStorageByName NOR penalty delay', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.NOR_ADDRESS,
      slotId,
      SLOT_NOR_STUCK_PENALTY_DELAY,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    // 19h 23mins
    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000069780')
  }, 120_000)

  test('getStorageByName NOR type', async () => {
    const data = await ethClient.getStorageBySlotName(address.NOR_ADDRESS, slotId, SLOT_NOR_TYPE, blockHash)
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x637572617465642d6f6e636861696e2d76310000000000000000000000000000')
  }, 120_000)

  test('getStorageByName LEGACY_ORACLE Versioned.contractVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.LEGACY_ORACLE_ADDRESS,
      slotId,
      SLOT_LEGACY_ORACLE_VERSIONED_CONTRACT_VERSION,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000004')
  }, 120_000)

  test('getStorageByName LEGACY_ORACLE LidoOracle.accountingOracle', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.LEGACY_ORACLE_ADDRESS,
      slotId,
      SLOT_LEGACY_ORACLE_ACCOUNTING_ORACLE,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000852ded011285fe67063a08005c71a85690503cee')
  }, 120_000)

  test('getStorageByName LEGACY_ORACLE LidoOracle.beaconSpec', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.LEGACY_ORACLE_ADDRESS,
      slotId,
      SLOT_LEGACY_ORACLE_BEACON_SPEC,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x00000000000000e10000000000000020000000000000000c000000005fc63057')
  }, 120_000)

  test('getStorageByName LEGACY_ORACLE LidoOracle.contractVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.LEGACY_ORACLE_ADDRESS,
      slotId,
      SLOT_LEGACY_ORACLE_CONTRACT_VERSION,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000')
  }, 120_000)

  test('getStorageByName LEGACY_ORACLE LidoOracle.lido', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.LEGACY_ORACLE_ADDRESS,
      slotId,
      SLOT_LEGACY_ORACLE_LIDO,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000ae7ab96520de3a18e5e111b5eaab095312d7fe84')
  }, 120_000)

  test('getStorageByName ACCOUNTING_ORACLE Versioned.contractVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.ACCOUNTING_ORACLE_ADDRESS,
      slotId,
      SLOT_ACCOUNTING_ORACLE_VERSIONED_CONTRACT_VERSION,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001')
  }, 120_000)

  test('getStorageByName ACCOUNTING_ORACLE consensusContract', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.ACCOUNTING_ORACLE_ADDRESS,
      slotId,
      SLOT_ACCOUNTING_ORACLE_CONSENSUS_CONTRACT,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000d624b08c83baecf0807dd2c6880c3154a5f0b288')
  }, 120_000)

  test('getStorageByName ACCOUNTING_ORACLE consensusVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.ACCOUNTING_ORACLE_ADDRESS,
      slotId,
      SLOT_ACCOUNTING_ORACLE_CONSENSUS_VERSION,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001')
  }, 120_000)

  test('getStorageByName STAKING_ROUTER Versioned.contractVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.STAKING_ROUTER_ADDRESS,
      slotId,
      SLOT_STAKING_ROUTER_VERSIONED_CONTRACT_VERSION,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001')
  }, 120_000)

  test('getStorageByName STAKING_ROUTER StakingRouter.lido', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.STAKING_ROUTER_ADDRESS,
      slotId,
      SLOTS_STAKING_ROUTER_LIDO,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000ae7ab96520de3a18e5e111b5eaab095312d7fe84')
  }, 120_000)

  test('getStorageByName STAKING_ROUTER StakingRouter.lastStakingModuleId', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.STAKING_ROUTER_ADDRESS,
      slotId,
      SLOTS_STAKING_ROUTER_LAST_STAKING_MODULE_ID,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000002')
  }, 120_000)

  test('getStorageByName STAKING_ROUTER StakingRouter.stakingModulesCount', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.STAKING_ROUTER_ADDRESS,
      slotId,
      SLOTS_STAKING_ROUTER_STAKING_MODULES_COUNT,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000002')
  }, 120_000)

  test('getStorageByName STAKING_ROUTER StakingRouter.withdrawalCredentials', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.STAKING_ROUTER_ADDRESS,
      slotId,
      SLOTS_STAKING_ROUTER_WITHDRAWAL_CREDENTIALS,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x010000000000000000000000b9d7934878b5fb9610b3fe8a5e441e8fad7e293f')
  }, 120_000)

  test('getStorageByName WITHDRAWALS_QUEUE WithdrawalsQueue.Versioned.contractVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.WITHDRAWALS_QUEUE_ADDRESS,
      slotId,
      SLOT_WITHDRAWALS_QUEUE_VERSIONED_CONTRACT_VERSION,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001')
  }, 120_000)

  test('getStorageByName WITHDRAWALS_QUEUE WithdrawalsQueue.bunkerModeSinceTimestamp', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.WITHDRAWALS_QUEUE_ADDRESS,
      slotId,
      SLOT_WITHDRAWALS_QUEUE_BUNKER_MODE_SINCE_TIMESTAMP,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  }, 120_000)

  test('getStorageByName WITHDRAWALS_QUEUE WithdrawalsQueue.baseUri', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.WITHDRAWALS_QUEUE_ADDRESS,
      slotId,
      SLOT_WITHDRAWALS_QUEUE_BASE_URI,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x68747470733a2f2f77712d6170692e6c69646f2e66692f76312f6e667400003a')
  }, 120_000)

  test('getStorageByName WITHDRAWALS_QUEUE WithdrawalsQueue.nftDescriptorAddress', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.WITHDRAWALS_QUEUE_ADDRESS,
      slotId,
      SLOT_WITHDRAWALS_QUEUE_NFT_DESCRIPTOR_ADDRESS,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000')
  }, 120_000)

  test('getStorageByName VEBO Versioned.contractVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.VEBO_ADDRESS,
      slotId,
      SLOT_VEBO_VERSIONED_CONTRACT_VERSION,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001')
  }, 120_000)

  test('getStorageByName VEBO consensusContract', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.VEBO_ADDRESS,
      slotId,
      SLOT_VEBO_CONSENSUS_CONTRACT,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000007fadb6358950c5faa66cb5eb8ee5147de3df355a')
  }, 120_000)

  test('getStorageByName VEBO consensusVersion', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.VEBO_ADDRESS,
      slotId,
      SLOT_VEBO_ORACLE_CONSENSUS_VERSION,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001')
  }, 120_000)

  test('getStorageByName ACCOUNTING_HASH_CONSENSUS frameConfig', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ACCOUNTING_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_ACCOUNTING_HASH_CONSENSUS_FRAME_CONFIG,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000006400000000000000e10000000000031380')
  }, 120_000)

  test('getStorageByName ACCOUNTING_HASH_CONSENSUS memberAddress', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ACCOUNTING_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_ACCOUNTING_HASH_CONSENSUS_MEMBER_ADDRESSES,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000009')

    const len = new BigNumber(data.right.value).toNumber()

    const members = await ethClient.getStorageArrayAtSlotAddr(
      address.ACCOUNTING_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_ACCOUNTING_HASH_CONSENSUS_MEMBER_ADDRESSES,
      blockHash,
      len,
    )
    if (E.isLeft(members)) {
      throw members.left.message
    }

    expect(members.right.values[0]).toEqual('0x000000000000000000000000140bd8fbdc884f48da7cb1c09be8a2fadfea776e')
    expect(members.right.values[1]).toEqual('0x000000000000000000000000a7410857abbf75043d61ea54e07d57a6eb6ef186')
    expect(members.right.values[2]).toEqual('0x000000000000000000000000404335bce530400a5814375e7ec1fb55faff3ea2')
    expect(members.right.values[3]).toEqual('0x000000000000000000000000946d3b081ed19173dc83cd974fc69e1e760b7d78')
    expect(members.right.values[4]).toEqual('0x000000000000000000000000007de4a5f7bc37e2f26c0cb2e8a95006ee9b89b5')
    expect(members.right.values[5]).toEqual('0x000000000000000000000000ec4bfbaf681eb505b94e4a7849877dc6c600ca3a')
    expect(members.right.values[6]).toEqual('0x00000000000000000000000061c91ecd902eb56e314bb2d5c5c07785444ea1c8')
    expect(members.right.values[7]).toEqual('0x0000000000000000000000001ca0fec59b86f549e1f1184d97cb47794c8af58d')
    expect(members.right.values[8]).toEqual('0x000000000000000000000000c79f702202e3a6b0b6310b537e786b9acaa19baf')
  }, 120_000)

  test('getStorageByName ACCOUNTING_HASH_CONSENSUS consensus_quorum', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ACCOUNTING_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_ACCOUNTING_HASH_CONSENSUS_QUORUM,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000005')
  }, 120_000)

  test('getStorageByName ACCOUNTING_HASH_CONSENSUS report_processor', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ACCOUNTING_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_ACCOUNTING_HASH_CONSENSUS_REPORT_PROCESSOR,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000852ded011285fe67063a08005c71a85690503cee')
  }, 120_000)

  test('getStorageByName VEBO_HASH_CONSENSUS frameConfig', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.VEBO_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_VEBO_HASH_CONSENSUS_FRAME_CONFIG,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x00000000000000000000000000000064000000000000004b0000000000031380')
  }, 120_000)

  test('getStorageByName VEBO_HASH_CONSENSUS quorum', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.VEBO_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_VEBO_HASH_CONSENSUS_QUORUM,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000005')
  }, 120_000)

  test('getStorageByName VEBO_HASH_CONSENSUS reportProcessor', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.VEBO_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_VEBO_HASH_CONSENSUS_REPORT_PROCESSOR,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000de4ea0184c2ad0baca7183356aea5b8d5bf5c6e')
  }, 120_000)

  test('getStorageByName VEBO_HASH_CONSENSUS memberAddress', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.VEBO_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_VEBO_HASH_CONSENSUS_MEMBER_ADDRESSES,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000009')

    const len = new BigNumber(data.right.value).toNumber()

    const members = await ethClient.getStorageArrayAtSlotAddr(
      address.VEBO_HASH_CONSENSUS_ADDRESS,
      slotId,
      SLOT_VEBO_HASH_CONSENSUS_MEMBER_ADDRESSES,
      blockHash,
      len,
    )
    if (E.isLeft(members)) {
      throw members.left.message
    }

    expect(members.right.values[0]).toEqual('0x000000000000000000000000140bd8fbdc884f48da7cb1c09be8a2fadfea776e')
    expect(members.right.values[1]).toEqual('0x000000000000000000000000a7410857abbf75043d61ea54e07d57a6eb6ef186')
    expect(members.right.values[2]).toEqual('0x000000000000000000000000404335bce530400a5814375e7ec1fb55faff3ea2')
    expect(members.right.values[3]).toEqual('0x000000000000000000000000946d3b081ed19173dc83cd974fc69e1e760b7d78')
    expect(members.right.values[4]).toEqual('0x000000000000000000000000007de4a5f7bc37e2f26c0cb2e8a95006ee9b89b5')
    expect(members.right.values[5]).toEqual('0x000000000000000000000000ec4bfbaf681eb505b94e4a7849877dc6c600ca3a')
    expect(members.right.values[6]).toEqual('0x00000000000000000000000061c91ecd902eb56e314bb2d5c5c07785444ea1c8')
    expect(members.right.values[7]).toEqual('0x0000000000000000000000001ca0fec59b86f549e1f1184d97cb47794c8af58d')
    expect(members.right.values[8]).toEqual('0x000000000000000000000000c79f702202e3a6b0b6310b537e786b9acaa19baf')
  }, 120_000)

  test('getStorageByName DSM maxDepositsPerBlock', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.DEPOSIT_SECURITY_ADDRESS,
      slotId,
      SLOT_DSM_HASH_MAX_DEPOSITS_PER_BLOCK,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000096')
  }, 120_000)

  test('getStorageByName DSM minDepositBlockDistance', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.DEPOSIT_SECURITY_ADDRESS,
      slotId,
      SLOT_DSM_HASH_MIN_DEPOSIT_BLOCK_DISTANCE,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000019')
  }, 120_000)

  test('getStorageByName DSM pauseIntentValidityPeriodBlocks', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.DEPOSIT_SECURITY_ADDRESS,
      slotId,
      SLOT_DSM_HASH_PAUSE_INTENT_VALIDITY_PERIOD_BLOCKS,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x00000000000000000000000000000000000000000000000000000000000019f6')
  }, 120_000)

  test('getStorageByName DSM owner', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.DEPOSIT_SECURITY_ADDRESS,
      slotId,
      SLOT_DSM_OWNER,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    // Aragon Agent: 0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c (proxy)
    expect(data.right.value).toEqual('0x0000000000000000000000003e40d73eb977dc6a537af587d48316fee66e9c8c')
  }, 120_000)

  test('getStorageByName DSM quorum', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.DEPOSIT_SECURITY_ADDRESS,
      slotId,
      SLOT_DSM_QUORUM,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000004')
  }, 120_000)

  test('getStorageByName DSM guardians', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.DEPOSIT_SECURITY_ADDRESS,
      slotId,
      SLOT_DSM_GUARDIANS,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000006')

    const len = new BigNumber(data.right.value).toNumber()

    const members = await ethClient.getStorageArrayAtSlotAddr(
      address.DEPOSIT_SECURITY_ADDRESS,
      slotId,
      SLOT_DSM_GUARDIANS,
      blockHash,
      len,
    )
    if (E.isLeft(members)) {
      throw members.left.message
    }

    expect(members.right.values[0]).toEqual('0x0000000000000000000000005fd0ddbc3351d009eb3f88de7cd081a614c519f1')
    expect(members.right.values[1]).toEqual('0x0000000000000000000000007912fa976bcde9c2cf728e213e892ad7588e6aaf')
    expect(members.right.values[2]).toEqual('0x00000000000000000000000014d5d5b71e048d2d75a39ffc5b407e3a3ab6f314')
    expect(members.right.values[3]).toEqual('0x000000000000000000000000f82d88217c249297c6037ba77ce34b3d8a90ab43')
    expect(members.right.values[4]).toEqual('0x000000000000000000000000a56b128ea2ea237052b0fa2a96a387c0e43157d8')
    expect(members.right.values[5]).toEqual('0x000000000000000000000000d4ef84b638b334699bcf5af4b0410b8ccd71943f')
  }, 120_000)

  test('getStorageByName wstETH stETH', async () => {
    const data = await ethClient.getStorageAtSlotAddr(address.WSTETH_ADDRESS, slotId, SLOT_WSTETH, blockHash)
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000ae7ab96520de3a18e5e111b5eaab095312d7fe84')
  }, 120_000)

  test('getStorageByName MevBoost owner', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
      slotId,
      SLOT_MEV_BOOST_OWNER,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000003e40d73eb977dc6a537af587d48316fee66e9c8c')
  }, 120_000)

  test('getStorageByName MevBoost manager', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
      slotId,
      SLOT_MEV_BOOST_MANAGER,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x00000000000000000000000098be4a407bff0c125e25fbe9eb1165504349c37d')
  }, 120_000)

  test('getStorageByName MevBoost allowed_list_version', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
      slotId,
      SLOT_MEV_BOOST_ALLOWED_LIST,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000012')
  }, 120_000)

  test('getStorageByName Aragon token', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ARAGON_VOTING_ADDRESS,
      slotId,
      SLOT_ARAGON_TOKEN,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000006f05b59d3b200005a98fcbea516cf06857215779fd812ca3bef1b32')
  }, 120_000)

  test('getStorageByName Aragon supportRequiredPct', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ARAGON_VOTING_ADDRESS,
      slotId,
      SLOT_ARAGON_SUPPORT_REQUIRED_PCT,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x00000000000000000000000000000000000000000003f48000b1a2bc2ec50000')
  }, 120_000)

  test('getStorageByName Aragon objectionPhaseTime', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ARAGON_VOTING_ADDRESS,
      slotId,
      SLOT_ARAGON_OBJECTION_PHASE_TIME,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000015180')
  }, 120_000)

  test('getStorageByName Aragon Manager token', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ARAGON_VOTING_ADDRESS,
      slotId,
      SLOT_ARAGON_MANAGER_TOKEN,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000006f05b59d3b200005a98fcbea516cf06857215779fd812ca3bef1b32')
  }, 120_000)

  test('getStorageByName Aragon Manager maxAccountTokens', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ARAGON_VOTING_ADDRESS,
      slotId,
      SLOT_ARAGON_MANAGER_MAX_ACCOUNT_TOKENS,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x00000000000000000000000000000000000000000003f48000b1a2bc2ec50000')
  }, 120_000)

  test('getStorageByName Aragon Finance vault', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.ARAGON_FINANCE_ADDRESS,
      slotId,
      SLOT_ARAGON_FINANCE_VAULT,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000003e40d73eb977dc6a537af587d48316fee66e9c8c')
  }, 120_000)

  test('getStorageByName Lido Treasury designatedSigner', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.LIDO_TREASURY_ADDRESS,
      slotId,
      SLOT_LIDO_TREASURY_DESIGNATED_SIGNER,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000000000')
  }, 120_000)

  test('getStorageByName Lido Insurance owner', async () => {
    const data = await ethClient.getStorageAtSlotAddr(
      address.LIDO_INSURANCE_ADDRESS,
      slotId,
      SLOT_LIDO_INSURANCE_OWNER,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000003e40d73eb977dc6a537af587d48316fee66e9c8c')
  }, 120_000)

  test('getStorageByName SIMPLE_DVT lidoLocator', async () => {
    const data = await ethClient.getStorageBySlotName(address.SIMPLEDVT_ADDRESS, slotId, SLOT_DVT_LOCATOR, blockHash)
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x000000000000000000000000c1d0b3de6792bf6b4b37eccdcc24e45978cfd2eb')
  }, 120_000)

  test('getStorageByName SIMPLE_DVT penalty delay', async () => {
    const data = await ethClient.getStorageBySlotName(
      address.SIMPLEDVT_ADDRESS,
      slotId,
      SLOT_DVT_STUCK_PENALTY_DELAY,
      blockHash,
    )
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x0000000000000000000000000000000000000000000000000000000000069780')
  }, 120_000)

  test('getStorageByName SIMPLE_DVT type', async () => {
    const data = await ethClient.getStorageBySlotName(address.SIMPLEDVT_ADDRESS, slotId, SLOT_DVT_TYPE, blockHash)
    if (E.isLeft(data)) {
      throw data.left.message
    }

    expect(data.right.value).toEqual('0x637572617465642d6f6e636861696e2d76310000000000000000000000000000')
  }, 120_000)
})
