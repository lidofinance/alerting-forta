import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { BlockEvent, ethers, Finding, FindingSeverity, FindingType, TransactionEvent } from 'forta-agent'
import { elapsedTime } from '../../shared/time'
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
import { etherscanAddress, formatAmount } from '../../shared/string'
import { handleEventsOfNotice } from '../../shared/notice'
import { EventOfNotice } from '../../entity/events'
import { KNOWN_ERC20 } from '../../shared/constants'

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
                blockNumber: block.number,
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

    let operationInfo = ''
    const orderInfo = await Promise.all(
      lastCreatedOrders.map(async (order) => {
        const duration = timestamp - order.timestamp

        const balanceResponse = await this.ethProvider.getOrderBalance(order.address)
        if (E.isLeft(balanceResponse)) {
          console.error(balanceResponse.left)
          throw new Error(`Could not get balance for ${order.address}`)
        }

        const balance = new BigNumber(balanceResponse.right.toString())

        const fulfilled = balance.lte(STETH_MAX_PRECISION)

        if (order.active && fulfilled) {
          const cowResp = await this.ethProvider.getStonksCOWInfo(
            order.blockNumber,
            txBlock.block.number,
            order.address,
          )
          if (E.isLeft(cowResp)) {
            console.error(cowResp.left)
            throw new Error(`Could not get order params for ${order.address}`)
          }
          const cowOrderArgs = cowResp.right

          let sellInfo = `unknown token`
          const sellToken = KNOWN_ERC20.get(cowOrderArgs?.sellToken?.toLowerCase())
          if (sellToken) {
            const sellAmount = formatAmount(cowOrderArgs?.sellAmount, sellToken.decimals, 4)
            sellInfo = `${sellAmount} ${sellToken?.name}`
          }

          let buyInfo = `unknown token`
          const buyToken = KNOWN_ERC20.get(cowOrderArgs?.buyToken?.toLowerCase())
          if (buyToken) {
            const buyAmount = formatAmount(cowOrderArgs?.buyAmount, buyToken?.decimals, 4)
            buyInfo = `${buyAmount} ${buyToken?.name}`
          }

          operationInfo = `${sellInfo} -> ${buyInfo}`
        }

        return {
          order,
          balance,
          fulfilled,
          duration,
        }
      }),
    )

    for (const { order, fulfilled, duration, balance } of orderInfo) {
      if (duration < order.orderDuration && !fulfilled) {
        continue
      }

      if (order.active) {
        if (fulfilled) {
          findings.push(
            Finding.fromObject({
              name: '✅ Stonks: order fulfilled',
              description: `Stonks order ${etherscanAddress(order.address)} was fulfilled ${operationInfo}`,
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
          blockNumber: txEvent.block.number,
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
