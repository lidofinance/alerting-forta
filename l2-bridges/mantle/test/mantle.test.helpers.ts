import { Constants } from '../../common/constants'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Contract, ethers } from 'ethers'
import { BigNumberish } from 'ethers'


export async function withdrawWsteth(amount: BigNumberish, params: Constants, provider: JsonRpcProvider, sender: string) {
  const l2BridgeAddress = params.L2_ERC20_TOKEN_GATEWAY.address

  await provider.send('hardhat_setBalance', [l2BridgeAddress, ethers.utils.parseEther('10').toHexString()])
  await provider.send('hardhat_setBalance', [sender, ethers.utils.parseEther('10').toHexString()])

  const l2Wsteth = new Contract(params.L2_WSTETH_BRIDGED.address, MANTLE_WSTETH_MINT_ABI, provider)
  const bridgeSigner = await provider.getSigner(l2BridgeAddress)
  const mintTx = await l2Wsteth.connect(bridgeSigner).bridgeMint(sender, amount)
  await mintTx.wait()

  const bridge = new Contract(l2BridgeAddress, MANTLE_BRIDGE_WITHDRAW_ABI, provider)
  const senderSigner = await provider.getSigner(sender)
  const withdrawTx = await bridge.connect(senderSigner).withdraw(params.L2_WSTETH_BRIDGED.address, amount, 1000000, "0x")
  await withdrawTx.wait()
}


const MANTLE_BRIDGE_WITHDRAW_ABI = [
  {
    "inputs": [
        {
            "internalType": "address",
            "name": "l2Token_",
            "type": "address"
        },
        {
            "internalType": "uint256",
            "name": "amount_",
            "type": "uint256"
        },
        {
            "internalType": "uint32",
            "name": "l1Gas_",
            "type": "uint32"
        },
        {
            "internalType": "bytes",
            "name": "data_",
            "type": "bytes"
        }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]


const MANTLE_WSTETH_MINT_ABI = [
  {
      "inputs": [
          {
              "internalType": "address",
              "name": "_account",
              "type": "address"
          },
          {
              "internalType": "uint256",
              "name": "_amount",
              "type": "uint256"
          }
      ],
      "name": "bridgeMint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
