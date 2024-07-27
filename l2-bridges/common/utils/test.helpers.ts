const { spawn } = require('node:child_process')
import assert from 'assert'
import { SECOND_MS } from './time'
import { Constants } from '../constants';
import { ethers  } from 'forta-agent'
import * as Winston from 'winston'
import { ERC20Short__factory } from '../generated'
import { L2Client } from '../clients/l2_client'
import { MonitorWithdrawals } from '../services/monitor_withdrawals'

let TEST_NODE_PORT = 8577


export async function spawnTestNode(networkId: number, l2RpcUrl: string) {
  const nodeCmd = 'anvil'
  const nodeArgs = [
    '-p', `${TEST_NODE_PORT}`,
    '--chain', `${networkId}`,
    '--auto-impersonate',
    '--fork-url', l2RpcUrl,
  ]
  const nodeProcess = spawn(nodeCmd, nodeArgs);

  nodeProcess.stderr.on('data', (data: unknown) => {
    console.error(`stderr: ${data}`);
  });

  await new Promise((r) => setTimeout(r, SECOND_MS));

  assert(nodeProcess);
  assert(nodeProcess.exitCode === null);

  console.log(`Spawned test node: ${nodeCmd} ${nodeArgs.join(' ')}`)
  return { nodeProcess, rpcUrl: `http://localhost:${TEST_NODE_PORT}` }
}

export async function stopTestNode(nodeProcess: any) {
  assert(nodeProcess)
  nodeProcess.kill('SIGINT')
  await new Promise((r) => setTimeout(r, SECOND_MS))
  assert(nodeProcess.exitCode === 0)
}

export function createMonitorWithdrawals(params: Constants) {
  const logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const nodeClient = new ethers.providers.JsonRpcProvider(params.L2_NETWORK_RPC, params.L2_NETWORK_ID)
  const bridgedWstethRunner = ERC20Short__factory.connect(params.L2_WSTETH_BRIDGED.address, nodeClient)
  const l2Client = new L2Client(nodeClient, logger, bridgedWstethRunner, params.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)
  return new MonitorWithdrawals(l2Client, logger, params)
}
