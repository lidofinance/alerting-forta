import {
    BlockEvent,
    Finding,
    TransactionEvent,
    ethers,
    getProvider,
    isProduction,
    scanEthereum,
} from '@fortanetwork/forta-bot'

import { RPC_URL } from './config'
import { getLogger } from './logger'
import { CSAccountingSrv } from './services/CSAccounting/CSAccounting.srv'
import { CSFeeDistributorSrv } from './services/CSFeeDistributor/CSFeeDistributor.srv'
import { CSFeeOracleSrv } from './services/CSFeeOracle/CSFeeOracle.srv'
import { CSModuleSrv } from './services/CSModule/CSModule.srv'
import { EventsWatcherSrv } from './services/EventsWatcher/EventsWatcher.srv'
import { launchAlert } from './utils/findings'

const logger = getLogger('main')

async function main() {
    const { handleTransaction, handleBlock } = await getHandlers()

    scanEthereum({
        handleTransaction,
        handleBlock,
        rpcUrl: RPC_URL,
    })

    if (!isProduction) {
        return
    }

    // Run metrics server here if needed.
}

if (require.main === module) {
    main().catch(logger.error)
}

async function getHandlers() {
    const { blockIdentifier } = await parseArgs()

    const services = [
        new CSFeeDistributorSrv(),
        new EventsWatcherSrv(),
        new CSAccountingSrv(),
        new CSFeeOracleSrv(),
        new CSModuleSrv(),
    ]

    for (const srv of services) {
        if ('initialize' in srv) {
            await srv.initialize(
                blockIdentifier ?? 'latest',
                await getProvider({
                    rpcUrl: RPC_URL,
                }),
            )
        }
    }

    logger.debug('Initialization complete')
    let isLaunchReported = false

    async function handleTransaction(txEvent: TransactionEvent, provider: ethers.Provider) {
        const results = await Promise.allSettled(
            services
                .filter((srv) => 'handleTransaction' in srv)
                .map((srv) => srv.handleTransaction(txEvent, provider)),
        )

        const out: Finding[] = []
        for (const r of results) {
            if (r.status === 'fulfilled') {
                out.push(...r.value)
            } else {
                // TODO: Some exceptions should crash an application in fact.
                // out.push(errorAlert(`Error processing tx ${txEvent.transaction.hash}`, r.reason))
                logger.error(r.reason)
            }
        }
        return out
    }

    async function handleBlock(blockEvent: BlockEvent, provider: ethers.Provider) {
        logger.debug(`Running handlers for block ${blockEvent.blockNumber}`)

        const results = await Promise.allSettled(
            services
                .filter((srv) => 'handleBlock' in srv)
                .map((srv) => srv.handleBlock(blockEvent, provider)),
        )

        const out: Finding[] = []
        for (const r of results) {
            if (r.status === 'fulfilled') {
                out.push(...r.value)
            } else {
                // TODO: Some exceptions should crash an application in fact.
                // out.push(errorAlert(`Error processing block ${blockEvent.block.hash}`, r.reason))
                logger.error(r.reason)
            }
        }

        if (!isLaunchReported) {
            out.push(launchAlert())
            isLaunchReported = true
        }

        return out
    }

    return {
        handleTransaction,
        handleBlock,
    }
}

async function parseArgs() {
    let blockIdentifier: string | number | undefined = process.env['FORTA_CLI_BLOCK']

    if (process.env['FORTA_CLI_RANGE']) {
        blockIdentifier = process.env['FORTA_CLI_RANGE'].split('..')[0]
    }

    if (blockIdentifier && !blockIdentifier.startsWith('0x')) {
        blockIdentifier = parseInt(blockIdentifier)
    }

    const txIdentifier = process.env['FORTA_CLI_TX']?.split(',')[0]
    if (txIdentifier) {
        const provider = await getProvider({
            rpcUrl: RPC_URL,
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
