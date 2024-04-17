import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { BlockEvent, ethers, Finding, FindingSeverity, FindingType, TransactionEvent } from 'forta-agent'
import { elapsedTime } from '../../utils/time'
import { ETHProvider } from '../../clients/eth_provider'
import { CreatedOrder, EventArgs } from './contract'
import {
  BLOCK_TO_WATCH_TIME,
  BLOCK_WINDOW,
  ORDER_EVENTS_OF_NOTICE,
  STETH_MAX_PRECISION,
  STONKS,
  STONKS_EVENTS_OF_NOTICE,
  STONKS_ORDER_CREATED_EVENT,
  STONKS_ORDER_CREATION,
} from 'constants/stonks'
import BigNumber from 'bignumber.js'
import { etherscanAddress } from '../../utils/string'
import { networkAlert } from '../../utils/errors'
import { handleEventsOfNotice } from '../../utils/notice'
import { EventOfNotice } from '../../entity/events'

export class StonksSrv {
  private readonly logger: Logger
  private readonly name = 'StonksSrv'
  private readonly ethProvider: ETHProvider
  private readonly createdOrders: CreatedOrder[] = []

  constructor(logger: Logger, ethProvider: ETHProvider) {
    this.logger = logger
    this.ethProvider = ethProvider
  }

  public async initialize(currentBlockNumber: number) {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlockNumber}`, start))
    const currentBlock = await this.ethProvider.getBlock(currentBlockNumber)
    if (E.isLeft(currentBlock)) {
      return currentBlock.left
    }

    const initResult = await this.loadCreatedOrders(currentBlock.right)
    if (E.isLeft(initResult)) {
      throw new Error(`Could not initialize ${this.name}. Cause: ${initResult.left}`)
    }
  }

  private async loadCreatedOrders(currentBlock: ethers.providers.Block) {
    try {
      await Promise.all(
        STONKS.map(async (stonks) => {
          const contractOrderEvents = await this.ethProvider.getStonksOrderEvents(stonks.address, currentBlock.number)
          if (E.isLeft(contractOrderEvents)) {
            throw contractOrderEvents.left
          }

          const orderParams = await this.ethProvider.getStonksOrderParams(stonks.address)
          if (E.isLeft(orderParams)) {
            throw new Error(`Could not get tokenFrom or orderDuration for ${stonks.address}`)
          }
          const [tokenFrom, , orderDuration] = orderParams.right

          const events = contractOrderEvents.right.filter((event) => event.event === STONKS_ORDER_CREATED_EVENT)
          await Promise.all(
            events.map(async (event) => {
              if (this.createdOrders.some((order) => order.address === event?.args?.orderContract)) {
                return
              }

              const block = await event.getBlock()
              this.createdOrders.push({
                tokenFrom,
                address: event?.args?.orderContract,
                orderDuration: orderDuration.toNumber(),
                timestamp: block.timestamp,
                active: currentBlock.timestamp - block.timestamp < orderDuration.toNumber(),
              })
            }),
          )
        }),
      )
      return E.right(null)
    } catch (e) {
      return E.left(`Could not load created orders. Cause: ${e}`)
    }
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
    if (blockEvent.blockNumber % BLOCK_WINDOW != 0) {
      return []
    }
    return this.handleOrderSettlement(blockEvent)
  }

  public async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
    const findings: Finding[] = []
    await this.handleOrderCreation(txEvent)
    findings.push(...handleEventsOfNotice(txEvent, STONKS_EVENTS_OF_NOTICE))
    findings.push(...handleEventsOfNotice(txEvent, getOrderEventsOfNotice(this.createdOrders)))

    return findings
  }

  public async handleOrderSettlement(txBlock: BlockEvent) {
    const findings: Finding[] = []
    if (this.createdOrders.length === 0) {
      return findings
    }

    const timestamp = txBlock.block.timestamp

    const lastCreatedOrders = [...this.createdOrders]
    for (const order of lastCreatedOrders) {
      const duration = timestamp - order.timestamp
      if (duration < order.orderDuration) {
        continue
      }

      const tokenToSell = await this.ethProvider.getOrderBalance(order.tokenFrom)
      if (E.isLeft(tokenToSell)) {
        findings.push(
          networkAlert(
            tokenToSell.left,
            `Error in ${this.name}.${this.handleOrderSettlement.name} (uid:88ea9fb0)`,
            `Could not call ethProvider.getOrderBalance for address - ${order.tokenFrom}`,
          ),
        )
        continue
      }
      const balance = new BigNumber(tokenToSell.right.toString())

      if (order.active) {
        if (balance.lte(STETH_MAX_PRECISION)) {
          findings.push(
            Finding.fromObject({
              name: '✅ Stonks: order fulfill',
              description: `Stonks order ${etherscanAddress(order.address)} was fulfill`,
              alertId: 'STONKS-ORDER-FULFILL',
              severity: FindingSeverity.Info,
              type: FindingType.Info,
              metadata: { args: '?' },
            }),
          )
        } else {
          findings.push(
            Finding.fromObject({
              name: '❌ Stonks: order expired',
              description: `Stonks order ${etherscanAddress(order.address)} was expired`,
              alertId: 'STONKS-ORDER-EXPIRED',
              severity: FindingSeverity.Info,
              type: FindingType.Info,
              metadata: { args: '?' },
            }),
          )
        }
      }

      order.active = false
      if (balance.lte(STETH_MAX_PRECISION) || duration > BLOCK_TO_WATCH_TIME) {
        this.createdOrders.splice(this.createdOrders.indexOf(order), 1)
      }
    }
    return findings
  }

  public async handleOrderCreation(txEvent: TransactionEvent) {
    for (const stonksEvent of STONKS_ORDER_CREATION) {
      const stonksFindings = handleEventsOfNotice(txEvent, STONKS_ORDER_CREATION)
      for (const finding of stonksFindings) {
        const stonksAddress = stonksEvent.address
        const orderAddress = finding.metadata.args.split(',')[0].toLowerCase()
        if (this.createdOrders.some((order) => order.address === orderAddress)) {
          continue
        }

        const result = await this.ethProvider.getStonksOrderParams(stonksAddress)
        if (E.isLeft(result)) {
          return result.left
        }
        const [tokenFrom, , orderDuration] = result.right

        this.createdOrders.push({
          tokenFrom,
          address: orderAddress,
          orderDuration: orderDuration.toNumber(),
          timestamp: txEvent.block.timestamp,
          active: true,
        })
      }
    }
  }
}

const getOrderEventsOfNotice = (orders: CreatedOrder[]) => {
  const events: EventOfNotice[] = []
  orders.forEach((order) => {
    return ORDER_EVENTS_OF_NOTICE.forEach((event) => {
      events.push({
        ...event,
        address: order.address,
        description: (args: EventArgs) => event.description({ ...args, address: order.address }),
      })
    })
  })
  return events
}
