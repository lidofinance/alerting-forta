import { ethers, Finding, FindingSeverity, FindingType, getEthersProvider, Network, Transaction } from 'forta-agent'
import { App } from '../../src/app'
import { createTransactionEvent } from './utils'

describe('Withdrawals srv e2e tests', () => {
  const ethProvider = getEthersProvider()

  test('should return WITHDRAWALS-CLAIMED-AMOUNT-MORE-THAN-REQUESTED', async () => {
    const app = await App.getInstance()
    const txHash = '0xdf4c31a9886fc4269bfef601c6d0a287633d516d16d61d5b62b9341e704eb52c'

    const receipt = await ethProvider.send('eth_getTransactionReceipt', [txHash])
    const block = await ethProvider.send('eth_getBlockByNumber', [
      ethers.utils.hexValue(parseInt(receipt.blockNumber)),
      true,
    ])
    const transaction = block.transactions.find((tx: Transaction) => tx.hash.toLowerCase() === txHash)!
    const txEvent = createTransactionEvent(transaction, block, Network.MAINNET, [], receipt.logs)

    const initErr = await app.WithdrawalsSrv.initialize(19113262)
    if (initErr !== null) {
      fail(initErr.message)
    }
    const result = app.WithdrawalsSrv.handleTransaction(txEvent)

    const expected = Finding.fromObject({
      alertId: 'WITHDRAWALS-CLAIMED-AMOUNT-MORE-THAN-REQUESTED',
      description: `Request ID: [24651](https://etherscan.io/nft/0x889edc2edab5f40e902b864ad4d7ade8e412f9b1/24651)
Claimed: 40.29 ETH
Requested: 0.50 stETH
Difference: 39789303816004547510 wei
Owner: [0xb1326d9f095600Add48662AB9cECFA56F55645fa](https://etherscan.io/address/0xb1326d9f095600Add48662AB9cECFA56F55645fa)
Receiver: [0xb1326d9f095600Add48662AB9cECFA56F55645fa](https://etherscan.io/address/0xb1326d9f095600Add48662AB9cECFA56F55645fa)`,
      name: '⚠️Withdrawals: claimed amount is more than requested',
      severity: FindingSeverity.Critical,
      type: FindingType.Suspicious,
    })

    expect(result.length).toEqual(1)
    expect(result[0].alertId).toEqual(expected.alertId)
    // Floating value in description field.
    //
    // expect(result[0].description).toEqual(expected.description)
    expect(result[0].name).toEqual(expected.name)
    expect(result[0].severity).toEqual(expected.severity)
    expect(result[0].type).toEqual(expected.type)
  }, 120_000)
})
