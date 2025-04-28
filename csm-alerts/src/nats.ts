import { Finding, FindingSeverity } from '@fortanetwork/forta-bot'
import { decompress } from '@mongodb-js/zstd'
import { keccak256, toUtf8Bytes } from 'ethers'
import {
    AckPolicy,
    Consumer,
    DeliverPolicy,
    DiscardPolicy,
    JSONCodec,
    JetStreamClient,
    JetStreamManager,
    NatsConnection,
    RetentionPolicy,
    StoreCompression,
    Stream,
    StreamInfo,
    connect,
    nanos,
} from 'nats'

import { APP_NAME } from './config'
import { getLogger } from './logger'
import { getHandlers } from './main'
import { BlockEvent, Finding as NATSFinding, Severity } from './shared/nats'
import { getProvider } from './shared/provider'
import {
    onchainMonBlockToBlockEventV2,
    onchainMonBlockToListTransactionEventV2,
} from './utils/shim'

const logger = getLogger('nats')

const NATS_PUBLISH_TOPIC = process.env.NATS_PUBLISH_TOPIC ?? 'findings.csm.csm'
const NATS_LISTEN_TOPIC = process.env.NATS_LISTEN_TOPIC ?? 'blocks.mainnet.l1'
const NATS_SERVER_URL = process.env.NATS_SERVER_URL ?? 'localhost:4222'
const NATS_STREAM = process.env.NATS_STREAM ?? 'l1_block_stream'
const NATS_CONSUMER = `${APP_NAME}_consumer`

const SEVERITY_MAP: Record<FindingSeverity, Severity> = {
    0: 'Unknown',
    1: 'Info',
    2: 'Low',
    3: 'Medium',
    4: 'High',
    5: 'Critical',
}

async function main() {
    const nc = await safeConnect(NATS_SERVER_URL)
    const jsm = await nc.jetstreamManager()
    const js = nc.jetstream()

    await ensureStream(jsm)
    const consumer = await ensureConsumer(jsm, js)
    logger.info(`Connected to NATS (stream=${NATS_STREAM}, consumer=${NATS_CONSUMER})`)

    const provider = await getProvider()
    const chainId = Number((await provider.getNetwork()).chainId)

    const blockCodec = JSONCodec<BlockEvent>()
    const findingCodec = JSONCodec<NATSFinding>()

    let handlers: Awaited<ReturnType<typeof getHandlers>> | null = null

    for await (const msg of await consumer.consume()) {
        try {
            const buf = await decompress(Buffer.from(msg.data))
            const block = blockCodec.decode(buf)

            if (!handlers) handlers = await getHandlers(block.hash)
            const { handleBlock, handleTransaction } = handlers

            const blockFindings = await handleBlock(
                onchainMonBlockToBlockEventV2(block, chainId),
                provider,
            )

            const txFindings = []
            for (const tx of onchainMonBlockToListTransactionEventV2(block, chainId)) {
                txFindings.push(...(await handleTransaction(tx, provider)))
            }

            for (const finding of [...blockFindings, ...txFindings]) {
                publishFinding(nc, findingCodec, finding, block)
            }

            msg.ack()
        } catch (err) {
            logger.error(`Failed to process message: ${err}`)
            msg.nak()
        }
    }
}

async function safeConnect(servers: string): Promise<NatsConnection> {
    try {
        return await connect({ servers })
    } catch (err) {
        logger.error(`Could not connect to NATS (${servers})`)
        logger.error(err)
        process.exit(1)
    }
}

async function ensureStream(jsm: JetStreamManager): Promise<Stream | StreamInfo> {
    try {
        return await jsm.streams.get(NATS_STREAM)
    } catch {
        logger.warn(`Stream ${NATS_STREAM} not found – creating it.`)
        return await jsm.streams.add({
            name: NATS_STREAM,
            subjects: [NATS_LISTEN_TOPIC],
            discard: DiscardPolicy.Old,
            retention: RetentionPolicy.Interest,
            max_age: nanos(10 * 60 * 1000), // 10 min
            compression: StoreCompression.S2,
        })
    }
}

async function ensureConsumer(jsm: JetStreamManager, js: JetStreamClient): Promise<Consumer> {
    try {
        return await js.consumers.get(NATS_STREAM, NATS_CONSUMER)
    } catch {
        logger.info(`Consumer ${NATS_CONSUMER} not found`)
        try {
            await jsm.consumers.add(NATS_STREAM, {
                durable_name: NATS_CONSUMER,
                ack_policy: AckPolicy.Explicit,
                deliver_policy: DeliverPolicy.New,
                filter_subject: NATS_LISTEN_TOPIC,
                max_deliver: 10,
                max_ack_pending: 1,
                max_expires: nanos(6 * 60 * 1000),
                inactive_threshold: nanos(5 * 60 * 1000),
            })
            return await js.consumers.get(NATS_STREAM, NATS_CONSUMER)
        } catch (err) {
            logger.error(`Could not create consumer ${NATS_CONSUMER}: ${err}`)
            logger.error(err)
            process.exit(1)
        }
    }
}

function publishFinding(
    nc: NatsConnection,
    codec: ReturnType<typeof JSONCodec<NATSFinding>>,
    finding: Finding,
    block: BlockEvent,
): void {
    const enriched: NATSFinding = {
        ...finding,
        uniqueKey: finding.uniqueKey || findingId(finding),
        severity: SEVERITY_MAP[finding.severity],
        txHash: finding.source.transactions?.[0]?.hash,
        blockTimestamp: block.timestamp,
        blockNumber: block.number,
        botName: APP_NAME,
        team: 'CSM',
    }

    nc.publish(NATS_PUBLISH_TOPIC, codec.encode(enriched))
}

function findingId(f: Finding): string {
    return keccak256(toUtf8Bytes(`${f.name}${f.alertId}${JSON.stringify(f.source)}`))
}

main().catch((err) => logger.error(`Error: ${err}`))
