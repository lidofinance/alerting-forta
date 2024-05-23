import { AckPolicy, connect } from 'nats'
import { initialize, handleBlock, handleTransaction } from './agent'
import { Block, BlockEvent, EventType, Log, Network, Trace, Transaction, TxEventBlock } from 'forta-agent'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import * as process from 'node:process'
import { EvaluateBlockRequest, EvaluateTxRequest } from './generated/agent'

const main = async () => {
  // In this case the bot name will be ethereum-governance-v2 (parent of parent directory name).
  const botName = process.env.BOT_NAME + '1'
  if (!botName) {
    console.error(
      'BOT_NAME environment variable is required for the unique identifier for the consumer to keep track of the last acked message',
    )
    process.exit(1)
  }
  const natsURL = process.env.NATS_URL || 'nats://localhost:4222'
  const streamName = process.env.STREAM_NAME || 'ethereum_events'

  console.log(`NATS URL: ${natsURL}`)
  console.log(`Stream name: ${streamName}`)
  console.log(`Bot name: ${botName}`)

  const nc = await connect({ servers: natsURL })
  const js = nc.jetstream()
  const jsm = await nc.jetstreamManager()
  const stream = await jsm.streams.get(streamName)

  const blockConsumerInfo = await jsm.consumers.add(stream.name, {
    durable_name: `${botName}_block_consumer`, // Should be the unique identifier for the consumer to keep track of the last acked message.
    ack_policy: AckPolicy.Explicit,
    filter_subject: 'ethereum_events.block',
  })
  const blockConsumer = await js.consumers.get(stream.name, blockConsumerInfo.name)

  const txConsumerInfo = await jsm.consumers.add(stream.name, {
    durable_name: `${botName}_tx_consumer`, // Should be the unique identifier for the consumer to keep track of the last acked message.
    ack_policy: AckPolicy.Explicit,
    filter_subject: 'ethereum_events.transaction',
  })
  const txConsumer = await js.consumers.get(stream.name, txConsumerInfo.name)

  let initialized = false
  for (;;) {
    try {
      const blockMessage = await blockConsumer.next({ expires: 2500 })
      if (blockMessage) {
        const request = EvaluateBlockRequest.decode(blockMessage.data)
        const event = new BlockEvent(
          EventType.BLOCK,
          Network[request.event?.network?.chainId as keyof typeof Network],
          {
            ...request.event?.block,
            number: Number(request.event?.block?.number),
            timestamp: Number(request.event?.block?.timestamp),
          } as Block,
        )
        if (!initialized) {
          console.log('Initializing...')
          await initialize()
          initialized = true
        }

        const findings = await handleBlock(event)
        if (findings.length > 0) {
          console.log(findings)
        }
        blockMessage.ack()
        console.log(`Processed block ${event.block.number}`)
      }

      const txMessages = await txConsumer.fetch({ expires: 2500, max_messages: 200 })
      for await (const m of txMessages) {
        const request = EvaluateTxRequest.decode(m.data)
        const event = new TransactionEvent(
          EventType.BLOCK,
          Network[request.event?.network?.chainId as keyof typeof Network],
          request.event?.transaction as unknown as Transaction,
          request.event?.traces as Trace[],
          request.event?.addresses as { [key: string]: boolean },
          request.event?.block as unknown as TxEventBlock,
          request.event?.logs as unknown as Log[],
          request.event?.contractAddress as string | null,
        )
        const findings = await handleTransaction(event)
        if (findings.length > 0) {
          console.log(findings)
        }
        m.ack()
      }
      if (txMessages.getProcessed() > 0) {
        console.log(`Processed ${txMessages.getProcessed()} transactions`)
      }
    } catch (err) {
      console.log(`consume failed: ${err}`)
      break
    }
  }
}

main()
  .then(() => {
    console.log('Connected to NATS')
  })
  .catch((err) => {
    console.error(err)
  })
