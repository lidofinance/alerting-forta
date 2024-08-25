import * as child_process from 'node:child_process'
import { JsonRpcProvider } from '@ethersproject/providers'
import { strict as assert } from 'node:assert'
import { BlockEvent } from '../src/common/generated/proto/agent_pb'
import * as Winston from 'winston'
import { Finding } from '../src/common/generated/proto/alert_pb'
import { SECOND_MS } from '../src/common/utils/time'
import { Constants } from '../src/common/constants'
import { ERC20Short__factory } from '../src/common/generated'
// import { L2Client } from '../src/common/clients/l2_client'
// import { MonitorWithdrawals } from '../src/common/services/monitor_withdrawals'
import { L2Network } from '../src/common/alert-bundles'
import { mantleConstants } from '../src/mantle/config'
// import { optimismConstants } from '../src/optimism/config'
// import { scrollConstants } from '../../scroll/src/agent'
// import { mantleConstants } from '../../mantle/src/agent'
// import { zksyncConstants } from '../../zksync/src/agent'

export type ChildProcess = child_process.ChildProcessWithoutNullStreams

export async function getBlockEvent(provider: JsonRpcProvider, blockTag: string) {
  const blockFromProvider = await provider.getBlock(blockTag)
  const blockEvent = new BlockEvent()
  const block = new BlockEvent.EthBlock()
  block.setHash(blockFromProvider.hash)
  block.setParenthash(blockFromProvider.parentHash)
  assert(typeof blockFromProvider.number === 'number')
  block.setNumber(String(blockFromProvider.number))
  assert(typeof blockFromProvider.timestamp === 'number')
  block.setTimestamp(String(blockFromProvider.timestamp))
  blockEvent.setBlock(block)
  return blockEvent
}


export type GlobalThisExtended = (typeof globalThis) & {
  testNodes: { [key: string]: { process: ChildProcess, rpcUrl: string } }
}

export const portsByNetwork: { [key: string]: number } = {
  [L2Network.Mantle]: 8651,
  // [L2Network.ZkSync]: 8652,
  // [L2Network.Scroll]: 8653,
  // [L2Network.Optimism]: 8654,
}

export const paramsByNetwork: { [key: string]: Constants } = {
  // [L2Network.Optimism]: undefined, // optimismConstants,
  [L2Network.Mantle]: mantleConstants,
  // [L2Network.ZkSync]: undefined, // zksyncConstants,
  // [L2Network.Scroll]: undefined, // scrollConstants,
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

// export function createMonitorWithdrawals(params: Constants) {
//   const logger = Winston.createLogger({
//     format: Winston.format.simple(),
//     transports: [new Winston.transports.Console()],
//   })

//   const nodeClient = new ethers.providers.JsonRpcProvider(params.L2_NETWORK_RPC, params.L2_NETWORK_ID)
//   const bridgedWstethRunner = ERC20Short__factory.connect(params.L2_WSTETH_BRIDGED.address, nodeClient)
//   const l2Client = new L2Client(nodeClient, logger, bridgedWstethRunner, params.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)

//   return {
//     monitorWithdrawals: new MonitorWithdrawals(l2Client, logger, params),
//     provider: nodeClient,
//     l2Client,
//   }
// }

export function consoleDebugFinding(finding: Finding) {
  console.debug(`Finding:
    id: ${finding.getAlertid()}
    name: ${finding.getName()}
    description: ${finding.getDescription()}
`)
}

export function getAlertsString(findings: Finding[]) {
  let result = ""
  for (const f of findings) {
    result += `${f.getAlertid()}, `
  }
  return result
}