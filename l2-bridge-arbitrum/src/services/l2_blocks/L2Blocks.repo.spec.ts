import { Config } from '../../utils/env/env'
import { knex } from 'knex'
import * as Winston from 'winston'
import { L2BlocksRepo } from './L2Blocks.repo'
import * as E from 'fp-ts/Either'
import * as fs from 'node:fs'
import { BlockDto } from '../../entity/l2block'

describe('L2BlocksRepo', () => {
  const config = new Config()

  const dbClient = knex(Config.getTestKnexConfig(':memory'))
  const L2BlockRepo = new L2BlocksRepo(dbClient)

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  beforeAll(async () => {
    try {
      await dbClient.migrate.rollback({}, true)
    } catch (error) {
      logger.error('Could not destroy db:', error)
      process.exit(1)
    }

    try {
      await dbClient.migrate.latest()

      const sql = fs.readFileSync('./src/db/seeds/l2_blocks.sql', 'utf8')
      await dbClient.raw(sql)
    } catch (error) {
      logger.error('Error running migrations:', error)
      process.exit(1)
    }
  })

  afterAll(async () => {
    try {
      await dbClient.migrate.rollback({}, true)
    } catch (error) {
      logger.error('Could not destroy db:', error)
      process.exit(1)
    }
  })

  test('getLastL2Block is ok', async () => {
    let l2Block = await L2BlockRepo.getLastL2Block()
    if (E.isLeft(l2Block)) {
      throw l2Block
    }

    // @ts-ignore
    expect(l2Block.right.number).toEqual(233206351)
  })

  test('createOrUpdate is ok', async () => {
    const expected = new BlockDto(`hash`, `parentHash`, 321, 123)
    let err = await L2BlockRepo.createOrUpdate([expected])
    if (err !== null) {
      throw err
    }

    let result = await L2BlockRepo.getBlockById(expected.number)
    if (E.isLeft(result)) {
      throw result.left
    }
    // @ts-ignore
    expect(result.right.hash).toEqual(expected.hash)

    expected.hash = `changedHash`
    err = await L2BlockRepo.insertL2Block(expected)
    if (err !== null) {
      throw err
    }

    result = await L2BlockRepo.getBlockById(expected.number)
    if (E.isLeft(result)) {
      throw result.left
    }

    // @ts-ignore
    expect(result.right.hash).toEqual(`changedHash`)
  })

  test('getL2BlocksClosetTimestamp is 1721232784', async () => {
    const l1Timestamp = 1721232784
    let result = await L2BlockRepo.getL2BlocksClosetTimestamp(l1Timestamp)
    if (E.isLeft(result)) {
      throw result
    }

    // DB presentation
    //
    // 233204716 1721232784	2024-07-17 16:18:22 <-oldest
    // 233204717 1721232784	2024-07-17 16:18:22
    // 233204718 1721232784	2024-07-17 16:18:22
    // 233204719 1721232784	2024-07-17 16:18:22 <-latest

    expect(result.right[0].number).toEqual(233_204_716)
    expect(result.right[1].number).toEqual(233_204_719)
    expect(result.right[0].timestamp).toEqual(l1Timestamp)
    expect(result.right[1].timestamp).toEqual(l1Timestamp)
  })

  test('getL2BlocksFrom.length is 1636', async () => {
    const l2BlockNumber = 233204716
    let l2Block = await L2BlockRepo.getBlockById(l2BlockNumber)
    if (E.isLeft(l2Block)) {
      throw l2Block.left
    }

    //@ts-ignore
    let result = await L2BlockRepo.getL2BlocksFrom(l2Block.right.number)
    if (E.isLeft(result)) {
      throw result
    }

    expect(result.right.length).toEqual(1635)
  })
})
