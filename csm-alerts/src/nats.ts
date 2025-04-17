import { Finding } from '@fortanetwork/forta-bot'
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
    connect,
    nanos,
} from 'nats'

import { getLogger } from './logger'
import { getHandlers } from './main'
import { BlockEvent, Finding as NATSFinding, Severity } from './shared/nats'
import { getProvider } from './shared/provider'
import {
    onchainMonBlockToBlockEventV2,
    onchainMonBlockToListTransactionEventV2,
} from './utils/shim'

const logger = getLogger('nats')

async function main() {
    let nc: NatsConnection
    try {
        nc = await connect({ servers: 'localhost' })
    } catch (e) {
        logger.error('Could not connect to nats')
        logger.error(e)
        process.exit(1)
    }

    const js: JetStreamClient = nc.jetstream()
    const jsm: JetStreamManager = await nc.jetstreamManager()

    const streamName = 'l1_block_stream' // FIXME
    const consumerName = 'csm-alerts-consumer' // FIXME

    let stream: Stream | null = null
    try {
        stream = await jsm.streams.get(streamName)
    } catch (err) {
        logger.error(err)
    }

    if (stream === null) {
        await jsm.streams.add({
            name: streamName,
            subjects: ['blocks.mainnet.l1'], // FIXME
            discard: DiscardPolicy.Old,
            max_age: nanos(1000 * 60 * 10), // 10 minutes
            retention: RetentionPolicy.Interest,
            compression: StoreCompression.S2,
        })
    }
    let consumer: Consumer | null = null
    try {
        consumer = await js.consumers.get(streamName, consumerName)
        logger.info(`Connected to nats ${streamName}`)
    } catch (e: any) {
        logger.warn(e)
    }

    if (consumer === null) {
        await jsm.consumers.add(streamName, {
            durable_name: consumerName,
            max_deliver: 10, // 10 attempts before msg would skipped by nats server
            max_ack_pending: 1, // not deliver new messages before current(or number) will be acked
            max_expires: nanos(1000 * 60 * 6), // message older 6 minutes - are expire
            inactive_threshold: nanos(1000 * 60 * 5), // server will remove this consumer when it is inactive 5 minutes
            filter_subject: 'blocks.mainnet.l1', // FIXME
            deliver_policy: DeliverPolicy.New,
            ack_policy: AckPolicy.Explicit,
        })

        logger.info(`Consumer ${consumerName} created.`)
        consumer = await js.consumers.get(streamName, consumerName)
    }

    const provider = await getProvider()
    const chainId = Number((await provider.getNetwork()).chainId)

    const sc = JSONCodec<BlockEvent>()
    const encode = JSONCodec<NATSFinding>()
    let handlers = null

    for await (const msg of await consumer.consume()) {
        try {
            const decompressedBuffer = await decompress(Buffer.from(msg.data))
            const block = sc.decode(decompressedBuffer)
            if (handlers === null) handlers = await getHandlers(block.hash)
            const { handleBlock, handleTransaction } = handlers
            const blockFindings = await handleBlock(
                onchainMonBlockToBlockEventV2(block, Number(chainId)),
                provider,
            )
            const txFindings: Finding[] = []
            for (const tx of onchainMonBlockToListTransactionEventV2(block, Number(chainId))) {
                ;(await handleTransaction(tx, provider)).map((f) => txFindings.push(f))
            }
            const findings = [...blockFindings, ...txFindings]
            for (const finding of findings) {
                const id = finding.uniqueKey || findingId(finding)
                const messageWithId = { ...finding, id }

                nc.publish(
                    'findings.csm.csm',
                    encode.encode({
                        ...messageWithId,
                        severity: {
                            0: 'Unknown',
                            1: 'Info',
                            2: 'Low',
                            3: 'Medium',
                            4: 'High',
                            5: 'Critical',
                        }[finding.severity] as Severity,
                        botName: 'csm-alerts',
                        team: 'csm',
                    }),
                )
            }

            msg.ack()
        } catch (e) {
            logger.error(`Could not process block ${e}`)
            msg.nak()
        }
    }
}

function findingId(finding: Finding): string {
    return keccak256(toUtf8Bytes(finding.name + finding.alertId + JSON.stringify(finding.source)))
}

main().catch(logger.error)
