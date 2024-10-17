// SDKv1 aka 'forta-agent' shim.

import { getChainId, getProvider } from '@fortanetwork/forta-bot'
import { Finding, HandleBlock, HandleTransaction, Initialize, getJsonRpcUrl } from 'forta-agent'
import yargs from 'yargs'

import { getLogger } from './logger'
import {
    CSAccountingSrv,
    CSFeeDistributorSrv,
    CSFeeOracleSrv,
    CSModuleSrv,
    EventsWatcherSrv,
    GateSealSrv,
} from './services'
import { launchAlert } from './utils/findings'
import { blockEventV1toV2, findingV2toV1, txEventV1toV2 } from './utils/shim'

const logger = getLogger('agentV1')

const SERVICES = [
    new CSFeeDistributorSrv(),
    new EventsWatcherSrv(),
    new CSAccountingSrv(),
    new CSFeeOracleSrv(),
    new CSModuleSrv(),
    new GateSealSrv(),
]

let isLaunchReported = false

const handleBlock: HandleBlock = async (blockEvent) => {
    const out: Finding[] = []

    const provider = await getProvider({ rpcUrl: getJsonRpcUrl() })
    const blockEventV2 = blockEventV1toV2(blockEvent, getChainId())

    for (const srv of SERVICES.filter((srv) => 'handleBlock' in srv)) {
        const findings = await srv.handleBlock(blockEventV2, provider)
        out.push(...findings.map(findingV2toV1))
    }

    if (!isLaunchReported) {
        out.push(findingV2toV1(launchAlert()))
        isLaunchReported = true
    }

    return out
}

const handleTransaction: HandleTransaction = async (txEvent) => {
    const out: Finding[] = []

    const provider = await getProvider({ rpcUrl: getJsonRpcUrl() })
    const txEventV2 = txEventV1toV2(txEvent, getChainId())

    for (const srv of SERVICES.filter((srv) => 'handleTransaction' in srv)) {
        const findings = await srv.handleTransaction(txEventV2, provider)
        out.push(...findings.map(findingV2toV1))
    }

    return out
}

const initialize: Initialize = async () => {
    const { blockIdentifier } = await parseArgs()

    for (const srv of SERVICES.filter((srv) => 'initialize' in srv)) {
        logger.debug(`Running 'initialize' on ${srv.getName()}`)
        await srv.initialize(
            blockIdentifier ?? 'latest',
            await getProvider({
                rpcUrl: getJsonRpcUrl(),
            }),
        )
    }

    logger.debug('Initialization complete')
}

async function parseArgs() {
    const argv = await yargs(process.argv.slice(2))
        .option('range', { type: 'string' })
        .option('block', { type: 'string' })
        .option('tx', { type: 'string' }).argv

    let blockIdentifier: string | number | undefined = argv.block

    if (argv.range) {
        blockIdentifier = argv.range.split('..')[0]
    }

    if (blockIdentifier && !blockIdentifier.startsWith('0x')) {
        blockIdentifier = parseInt(blockIdentifier)
    }

    const txIdentifier = argv.tx
    if (txIdentifier) {
        const provider = await getProvider({
            rpcUrl: getJsonRpcUrl(),
        })

        const tx = await provider.getTransaction(txIdentifier)
        if (!tx?.blockHash) {
            throw Error(`Transaction ${txIdentifier} not mined`)
        }

        blockIdentifier = tx.blockHash
    }

    return {
        blockIdentifier,
        txIdentifier,
    }
}

export default {
    handleTransaction,
    handleBlock,
    initialize,
}
