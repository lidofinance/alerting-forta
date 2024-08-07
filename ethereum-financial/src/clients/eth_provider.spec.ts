import { App } from '../app'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { Address } from '../utils/constants'
import { ethers } from 'forta-agent'

const timeout: number = 120_000

describe('eth provider tests', () => {
  let ethProvider: ethers.providers.JsonRpcProvider

  const mainnet = 1
  const drpcProvider = 'https://eth.drpc.org/'

  beforeAll(async () => {
    ethProvider = new ethers.providers.JsonRpcProvider(drpcProvider, mainnet)
  })
  test(
    'getTotalSupply should return ok',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 19_526_474
      const block = await ethProvider.getBlock(blockNumber)

      const out = await app.ethClient.getTotalSupply(block.parentHash)
      if (E.isLeft(out)) {
        throw out.left.message
      }

      expect(out.right).toEqual(new BigNumber('2.85198055160763816094124e+23'))
    },
    timeout,
  )

  test(
    'getStethBalance should return ok',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 19526474
      const block = await ethProvider.getBlock(blockNumber)

      const out = await app.ethClient.getStethBalance(Address.AAVE_ASTETH_ADDRESS, block.parentHash)
      if (E.isLeft(out)) {
        throw out.left.message
      }

      expect(out.right).toEqual(new BigNumber('2.85198055160763816093772e+23'))
    },
    timeout,
  )

  test(
    'getStableDebtStEthTotalSupply should return ok',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 19526474
      const out = await app.ethClient.getStableDebtStEthTotalSupply(blockNumber)
      if (E.isLeft(out)) {
        throw out.left.message
      }

      expect(out.right).toEqual(new BigNumber('0'))
    },
    timeout,
  )

  test(
    'getVariableDebtStEthTotalSupply should return ok',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 19526474
      const out = await app.ethClient.getStableDebtStEthTotalSupply(blockNumber)
      if (E.isLeft(out)) {
        throw out.left.message
      }

      expect(out.right).toEqual(new BigNumber('0'))
    },
    timeout,
  )

  test(
    'getCurveEthBalance should return ok',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 19526474
      const out = await app.ethClient.getCurveEthBalance(blockNumber)
      if (E.isLeft(out)) {
        throw out.left.message
      }

      expect(out.right).toEqual(new BigNumber('3.5831379069447453967632e+22'))
    },
    timeout,
  )

  test(
    'getCurveStEthBalance should return ok',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 19526474
      const out = await app.ethClient.getCurveStEthBalance(blockNumber)
      if (E.isLeft(out)) {
        throw out.left.message
      }

      expect(out.right).toEqual(new BigNumber('4.0690351147102483025236e+22'))
    },
    timeout,
  )

  test(
    'getCurvePeg should return ok',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 19526474
      const out = await app.ethClient.getCurveStEthToEthPrice(blockNumber)
      if (E.isLeft(out)) {
        throw out.left.message
      }

      expect(out.right).toEqual(new BigNumber('0.99885819795589628841'))
    },
    timeout,
  )

  test(
    'getChainlinkPeg should return ok',
    async () => {
      const app = await App.getInstance(drpcProvider)

      const blockNumber = 19526474
      const out = await app.ethClient.getChainlinkStEthToEthPrice(blockNumber)
      if (E.isLeft(out)) {
        throw out.left.message
      }

      expect(out.right).toEqual(new BigNumber('0.9994786072757912'))
    },
    timeout,
  )
})
