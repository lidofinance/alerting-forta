import { AckPolicy, connect } from 'nats'
import { handleBlock } from './agent'
import { BlockEvent } from 'forta-agent'
import { EvaluateBlockRequest } from './generated/agent'

const main = async () => {
  const nc = await connect({ port: 4222 })
  const js = nc.jetstream()
  const jsm = await nc.jetstreamManager()
  const stream = 'events'

  await jsm.streams.get(stream)

  const consumerInfo = await jsm.consumers.add(stream, {
    durable_name: 'ethereum-governance-v2',
    ack_policy: AckPolicy.All,
  })
  const consumer = await js.consumers.get(stream, consumerInfo.name)

  for (;;) {
    console.log('waiting for blocks...')
    const messages = await consumer.consume()
    try {
      for await (const m of messages) {
        const request = EvaluateBlockRequest.decode(m.data)
        await handleBlock()(request.event as unknown as BlockEvent)
        m.ack()
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
