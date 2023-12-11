import { BaseProvider, IBaseProvider } from './clients/base_provider'
import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  HandleBlock,
} from 'forta-agent'
import { EventWatcher } from './services/eventWatcher/event_watcher'
import { L2_BRIDGE_EVENTS } from './utils/events/bridge_events'
import { GOV_BRIDGE_EVENTS } from './utils/events/gov_events'
import { ProxyWatcher } from './workers/proxy_watcher'
import {
  BASE_WST_ETH_BRIDGED,
  L2_ERC20_TOKEN_GATEWAY,
  WITHDRAWAL_INITIATED_EVENT,
} from './utils/constants'
import { argv } from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import { Metadata } from './entity/metadata'
import { PROXY_ADMIN_EVENTS } from './utils/events/proxy_admin_events'
import { ProxyContract } from './entity/proxy_contract'
import { L2Bridge__factory, ProxyShortABI__factory } from './generated'
import { MonitorWithdrawals } from './workers/monitor_withdrawals'
import { BaseBlockSrv } from './services/base_block_service'
import * as E from 'fp-ts/Either'
import VERSION from './utils/version'

const baseNetworkID = 8453
const baseRpcURL = Buffer.from(
  'aHR0cHM6Ly9iYXNlLW1haW5uZXQuZy5hbGNoZW15LmNvbS92Mi9sQ0RseWdMNk00eHpVdF9KTEQxMFo3MW9pMkRfeVpiNA==',
  'base64',
).toString('utf-8')

const nodeClient = new ethers.providers.JsonRpcProvider(
  baseRpcURL,
  baseNetworkID,
)

const baseClient = new BaseProvider(nodeClient)
const bridgeEventWatcher = new EventWatcher(
  'BridgeEventWatcher',
  L2_BRIDGE_EVENTS,
)
const govEventWatcher = new EventWatcher('GovEventWatcher', GOV_BRIDGE_EVENTS)
const proxyEventWatcher = new EventWatcher(
  'ProxyEventWatcher',
  PROXY_ADMIN_EVENTS,
)

const LIDO_PROXY_CONTRACTS: ProxyContract[] = [
  new ProxyContract(
    L2_ERC20_TOKEN_GATEWAY.name,
    L2_ERC20_TOKEN_GATEWAY.address,
    ProxyShortABI__factory.connect(L2_ERC20_TOKEN_GATEWAY.address, nodeClient),
  ),
  new ProxyContract(
    BASE_WST_ETH_BRIDGED.name,
    BASE_WST_ETH_BRIDGED.address,
    ProxyShortABI__factory.connect(BASE_WST_ETH_BRIDGED.address, nodeClient),
  ),
]

const agent: BaseBlockSrv = new BaseBlockSrv(baseClient)
const proxyWorker: ProxyWatcher = new ProxyWatcher(LIDO_PROXY_CONTRACTS)

const l2Bridge = L2Bridge__factory.connect(
  L2_ERC20_TOKEN_GATEWAY.address,
  nodeClient,
)

const monitorWithdrawals = new MonitorWithdrawals(
  l2Bridge,
  L2_ERC20_TOKEN_GATEWAY.address,
  WITHDRAWAL_INITIATED_EVENT,
)

export function initialize(
  baseClient: IBaseProvider,
  proxyWatcher: ProxyWatcher,
  monitorWithdrawals: MonitorWithdrawals,
  outFinding: Finding[],
): Initialize {
  const metadata: Metadata = {
    'version.commitHash': VERSION.commitHash,
    'version.commitMsg': VERSION.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const latestBlockNumber = await baseClient.getStartedBlockForApp(argv)
    if (E.isLeft(latestBlockNumber)) {
      console.log(`Error: ${latestBlockNumber.left.message}`)
      console.log(`Stack: ${latestBlockNumber.left.stack}`)

      process.exit(1)
    }

    const agentMeta = await proxyWatcher.initialize(latestBlockNumber.right)
    if (E.isLeft(agentMeta)) {
      console.log(`Error: ${agentMeta.left.message}`)
      console.log(`Stack: ${agentMeta.left.stack}`)

      process.exit(1)
    }

    const monitorWithdrawalsInitResp = await monitorWithdrawals.initialize(
      latestBlockNumber.right,
    )
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      console.log(`Error: ${monitorWithdrawalsInitResp.left.message}`)
      console.log(`Stack: ${monitorWithdrawalsInitResp.left.stack}`)

      process.exit(1)
    }

    metadata[`${proxyWatcher.getName()}.lastAdmins`] =
      agentMeta.right.lastAdmins
    metadata[`${proxyWatcher.getName()}.lastImpls`] = agentMeta.right.lastImpls
    metadata[`${monitorWithdrawals.getName()}.currentWithdrawals`] =
      monitorWithdrawalsInitResp.right.currentWithdrawals

    const agents: string[] = [
      proxyWorker.getName(),
      monitorWithdrawals.getName(),
    ]
    metadata.agents = '[' + agents.toString() + ']'

    outFinding.push(
      Finding.fromObject({
        name: 'Agent launched',
        description: `Version: ${VERSION.desc}`,
        alertId: 'LIDO-AGENT-LAUNCHED',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata,
      }),
    )

    console.log('Bot initialization is done!')
  }
}

export const handleBlock = (
  blockSrv: BaseBlockSrv,
  bridgeWatcher: EventWatcher,
  govWatcher: EventWatcher,
  proxyEventWatcher: EventWatcher,
  proxyWorker: ProxyWatcher,
  monitorWithdrawals: MonitorWithdrawals,
  initFinding: Finding[],
): HandleBlock => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async function (blockEvent: BlockEvent): Promise<Finding[]> {
    const findings: Finding[] = []

    if (initFinding.length) {
      findings.push(...initFinding)
      initFinding = []
    }

    const blocksDto = await blockSrv.getBaseBlocks()
    if (E.isLeft(blocksDto)) {
      return [blocksDto.left]
    }
    console.log(
      `#ETH block ${blockEvent.blockNumber.toString()}. Fetching base blocks from ${
        blocksDto.right[0].number
      } to ${blocksDto.right[blocksDto.right.length - 1].number}`,
    )

    const logs = await blockSrv.getLogs(blocksDto.right)
    if (E.isLeft(logs)) {
      return [logs.left]
    }

    const bridgeEventFindings = bridgeWatcher.handleLogs(logs.right)
    const govEventFindings = govWatcher.handleLogs(logs.right)
    const proxyAdminEventFindings = proxyEventWatcher.handleLogs(logs.right)
    const monitorWithdrawalsFindings = monitorWithdrawals.handleBlocks(
      blocksDto.right,
    )

    const blockNumbers: number[] = []
    for (const log of logs.right) {
      blockNumbers.push(log.blockNumber)
    }
    const proxyWatcherFindings = await proxyWorker.handleBlocks(blockNumbers)

    monitorWithdrawals.handleWithdrawalEvent(logs.right, blocksDto.right)

    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...proxyWatcherFindings,
      ...monitorWithdrawalsFindings,
    )

    return findings
  }
}

const initFinding: Finding[] = []

export default {
  initialize: initialize(
    baseClient,
    proxyWorker,
    monitorWithdrawals,
    initFinding,
  ),
  handleBlock: handleBlock(
    agent,
    bridgeEventWatcher,
    govEventWatcher,
    proxyEventWatcher,
    proxyWorker,
    monitorWithdrawals,
    initFinding,
  ),
  // handleTransaction: handleTransaction(agent),
  // healthCheck: healthCheck(agent),
  // handleAlert: handleAlert(agent),
}

/*
Uncomment when need to listen to those events
export function handleTransaction(): HandleTransaction {
  return async function (txEvent: TransactionEvent): Promise<Finding[]> {
    try {
      // return await rootWorker.handleTransaction(txEvent)
    } catch (e) {
      console.log(e)

      return []
    }
  }
}

export function healthCheck(): HealthCheck {
  return async function (): Promise<string[] | void> {
    try {
    } catch (e) {
      console.log(e)

      return []
    }
  }
}

export const handleAlert = (): HandleAlert => {
  return async function (alertEvent: AlertEvent): Promise<Finding[]> {
    try {
    } catch (e) {
      console.log(e)

      return []
    }
  }
}*/
