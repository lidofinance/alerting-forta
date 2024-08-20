import * as child_process from 'node:child_process'
import { JsonRpcProvider } from '@ethersproject/providers'
import { strict as assert } from 'node:assert'
import { BlockEvent, EventType, Network, Block, ethers } from "forta-agent"
import * as Winston from 'winston'
import { SECOND_MS } from './time'
import { Constants } from '../constants'
import { ERC20Short__factory } from '../generated'
import { L2Client } from '../clients/l2_client'
import { MonitorWithdrawals } from '../services/monitor_withdrawals'
import { L2Network } from '../../common/alert-bundles'
import { optimismConstants } from '../../optimism/src/agent'
import { scrollConstants } from '../../scroll/src/agent'
import { mantleConstants } from '../../mantle/src/agent'
import { zksyncConstants } from '../../zksync/src/agent'

export type ChildProcess = child_process.ChildProcessWithoutNullStreams

export async function getLatestBlockEvent(provider: JsonRpcProvider, blockNumber: number | 'latest') {
  const currentL2Block = await provider.getBlock(blockNumber)
  const blockEvent = new BlockEvent(EventType.BLOCK, Network.MAINNET, currentL2Block as unknown as Block)
  return blockEvent
}


export type GlobalThisExtended = (typeof globalThis) & {
  testNodes: { [key: string]: { process: ChildProcess, rpcUrl: string } }
}

export const portsByNetwork = {
  [L2Network.Mantle]: 8651,
  [L2Network.ZkSync]: 8652,
  [L2Network.Scroll]: 8653,
  [L2Network.Optimism]: 8654,
}

export const paramsByNetwork = {
  [L2Network.Optimism]: optimismConstants,
  [L2Network.Mantle]: mantleConstants,
  [L2Network.ZkSync]: zksyncConstants,
  [L2Network.Scroll]: scrollConstants,
}


export const globalExtended: GlobalThisExtended = global as unknown as GlobalThisExtended


export async function spawnTestNode(networkId: number, l2RpcUrl: string, port: number) {
  const nodeCmd = 'anvil'
  const nodeArgs = [
    '-p', `${port}`,
    '--chain', `${networkId}`,
    '--auto-impersonate',
    '--fork-url', l2RpcUrl,
  ]
  const nodeProcess = child_process.spawn(nodeCmd, nodeArgs)

  nodeProcess.stderr.on('data', (data: unknown) => {
    console.error(`${nodeCmd}'s stderr: ${data}`)
  })

  await new Promise((r) => setTimeout(r, 2 * SECOND_MS))

  assert(nodeProcess)
  assert(nodeProcess.exitCode === null)

  console.log(`Spawned test node: ${nodeCmd} ${nodeArgs.join(' ')}`)
  return { nodeProcess, rpcUrl: `http://localhost:${port}` }
}

export async function stopTestNode(nodeProcess: ChildProcess) {
  assert(nodeProcess)
  nodeProcess.kill('SIGINT')
  await new Promise((r) => setTimeout(r, 1 * SECOND_MS))
  assert(nodeProcess.exitCode === 0, `ERROR: non-zero test node process exit code: ${nodeProcess.exitCode}`)
  console.debug(`Stopped anvil process with pid ${nodeProcess.pid}`)
}

export function createMonitorWithdrawals(params: Constants) {
  const logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const nodeClient = new ethers.providers.JsonRpcProvider(params.L2_NETWORK_RPC, params.L2_NETWORK_ID)
  const bridgedWstethRunner = ERC20Short__factory.connect(params.L2_WSTETH_BRIDGED.address, nodeClient)
  const l2Client = new L2Client(nodeClient, logger, bridgedWstethRunner, params.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)

  return {
    monitorWithdrawals: new MonitorWithdrawals(l2Client, logger, params),
    provider: nodeClient,
    l2Client,
  }
}
