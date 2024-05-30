import { FindingSeverity } from 'forta-agent'
import { etherscanAddress } from '../../string'
import BigNumber from 'bignumber.js'
import { EventOfNotice } from '../../../entity/events'
import { EventArgs } from '../../../services/stonks/contract'

export const STONKS_STETH_DAI_ADDRESS = '0x3e2D251275A92a8169A3B17A2C49016e2de492a7'
export const STONKS_STETH_USDC_ADDRESS = '0xf4F6A03E3dbf0aA22083be80fDD340943d275Ea5'
export const STONKS_STETH_USDT_ADDRESS = '0x7C2a1E25cA6D778eCaEBC8549371062487846aAF'
export const STONKS_DAI_USDC_ADDRESS = '0x79f5E20996abE9f6a48AF6f9b13f1E55AED6f06D'
export const STONKS_DAI_USDT_ADDRESS = '0x8Ba6D367D15Ebc52f3eBBdb4a8710948C0918d42'
export const STONKS_USDC_DAI_ADDRESS = '0x2B5a3944A654439379B206DE999639508bA2e850'
export const STONKS_USDC_USDT_ADDRESS = '0x278f7B6CBB3Cc37374e6a40bDFEBfff08f65A5C7'
export const STONKS_USDT_DAI_ADDRESS = '0x64B6aF9A108dCdF470E48e4c0147127F26221A7C'
export const STONKS_USDT_USDC_ADDRESS = '0x281e6BB6F26A94250aCEb24396a8E4190726C97e'

export const COW_PROTOCOL_ADDRESS = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'

export const STONKS_ORDER_CREATED_EVENT = 'OrderContractCreated'
export const STETH_MAX_PRECISION = new BigNumber(4)

export const BLOCK_WINDOW = 5 // about 1 min (one block is 12 sec)
export const BLOCK_TO_WATCH = 600 // about 120 min (one block is 12 sec)
export const BLOCK_TO_WATCH_TIME = 12 * BLOCK_TO_WATCH

export const STONKS_TOP_UP_ALLOWED_RECIPIENTS_ADDRESS = '0x6e04aed774b7c89bb43721acdd7d03c872a51b69'

export const STONKS = [
  {
    address: STONKS_STETH_DAI_ADDRESS,
    from: 'stETH',
    to: 'DAI',
  },
  {
    address: STONKS_STETH_USDC_ADDRESS,
    from: 'stETH',
    to: 'USDC',
  },
  {
    address: STONKS_STETH_USDT_ADDRESS,
    from: 'stETH',
    to: 'USDT',
  },
  {
    address: STONKS_DAI_USDC_ADDRESS,
    from: 'DAI',
    to: 'USDC',
  },
  {
    address: STONKS_DAI_USDT_ADDRESS,
    from: 'DAI',
    to: 'USDT',
  },
  {
    address: STONKS_USDC_DAI_ADDRESS,
    from: 'USDC',
    to: 'DAI',
  },
  {
    address: STONKS_USDC_USDT_ADDRESS,
    from: 'USDC',
    to: 'USDT',
  },
  {
    address: STONKS_USDT_DAI_ADDRESS,
    from: 'USDT',
    to: 'DAI',
  },
  {
    address: STONKS_USDT_USDC_ADDRESS,
    from: 'USDT',
    to: 'USDC',
  },
]
export const STONKS_ORDER_CREATION: EventOfNotice[] = []

export const STONKS_EVENTS_OF_NOTICE: EventOfNotice[] = []
export const ORDER_EVENTS_OF_NOTICE = [
  {
    address: '',
    event: 'event ManagerSet(address manager)',
    alertId: 'ORDER-MANAGER-CHANGED',
    name: '🚨 ORDER Factory: Manager changed',
    description: (args: EventArgs) =>
      `Manager of the ORDER factory was changed to ${etherscanAddress(args.manager)}\n` +
      `Order: ${etherscanAddress(args.address)}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: '',
    event: 'event ERC20Recovered(address indexed token, address indexed recipient, uint256 amount)',
    alertId: 'ORDER-ERC20-RECOVERED',
    name: 'ℹ️ Order: ERC20 recovered',
    description: (args: EventArgs) =>
      `ERC20 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${args.amount}\n` +
      `Order: ${etherscanAddress(args.address)}`,
    severity: FindingSeverity.Info,
  },
  {
    address: '',
    event: 'event ERC721Recovered(address indexed token, uint256 tokenId, address indexed recipient)',
    alertId: 'ORDER-ERC721-RECOVERED',
    name: 'ℹ️ Order: ERC721 recovered',
    description: (args: EventArgs) =>
      `ERC721 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}\n` +
      `Order: ${etherscanAddress(args.address)}`,
    severity: FindingSeverity.Info,
  },
  {
    address: '',
    event: 'event ERC1155Recovered(address token, uint256 tokenId, address recipient, uint256 amount)',
    alertId: 'ORDER-ERC1155-RECOVERED',
    name: 'ℹ️ Order: ERC1155 recovered',
    description: (args: EventArgs) =>
      `ERC1155 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}\n` +
      `Amount: ${args.amount}\n` +
      `Order: ${etherscanAddress(args.address)}`,
    severity: FindingSeverity.Info,
  },
  {
    address: '',
    event: 'event EtherRecovered(address indexed recipient, uint256 amount)',
    alertId: 'ORDER-ETHER-RECOVERED',
    name: 'ℹ️ Order: Ether recovered',
    description: (args: EventArgs) =>
      `Ether recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Amount: ${args.amount}\n` +
      `Order: ${etherscanAddress(args.address)}`,
    severity: FindingSeverity.Info,
  },
]

// fill events by stonks
STONKS.forEach(({ address, to, from }) => {
  STONKS_ORDER_CREATION.push({
    address: address.toLocaleLowerCase(),
    event: 'event OrderContractCreated(address indexed orderContract,uint256 minBuyAmount)',
    alertId: 'STONKS-ORDER-CREATED',
    name: 'ℹ️ Stonks: order created',
    description: (args: EventArgs) =>
      `Order from ${from} to ${to} created:\n` +
      `Order address: ${etherscanAddress(args.orderContract)}\n` +
      `Amount min: ${args.minBuyAmount}`,
    severity: FindingSeverity.Info,
  })
  STONKS_EVENTS_OF_NOTICE.push({
    address,
    event: 'event ManagerSet(address manager)',
    alertId: 'STONKS-MANAGER-CHANGED',
    name: '🚨 STONKS Factory: Manager changed',
    description: (args: EventArgs) =>
      `Manager of the STONKS factory was changed to ${etherscanAddress(args.manager)}\n` +
      `Stonks: ${etherscanAddress(address)}\n` +
      `From ${from} to ${to}`,
    severity: FindingSeverity.Critical,
  })
  STONKS_EVENTS_OF_NOTICE.push({
    address,
    event: 'event ERC20Recovered(address indexed token, address indexed recipient, uint256 amount)',
    alertId: 'STONKS-ERC20-RECOVERED',
    name: 'ℹ️ Stonks: ERC20 recovered',
    description: (args: EventArgs) =>
      `ERC20 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${args.amount}\n` +
      `Stonks: ${etherscanAddress(address)}\n` +
      `From ${from} to ${to}`,
    severity: FindingSeverity.Info,
  })
  STONKS_EVENTS_OF_NOTICE.push({
    address,
    event: 'event ERC721Recovered(address indexed token, uint256 tokenId, address indexed recipient)',
    alertId: 'STONKS-ERC721-RECOVERED',
    name: 'ℹ️ Stonks: ERC721 recovered',
    description: (args: EventArgs) =>
      `ERC721 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}\n` +
      `Stonks: ${etherscanAddress(address)}\n` +
      `From ${from} to ${to}`,
    severity: FindingSeverity.Info,
  })
  STONKS_EVENTS_OF_NOTICE.push({
    address,
    event: 'event ERC1155Recovered(address token, uint256 tokenId, address recipient, uint256 amount)',
    alertId: 'STONKS-ERC1155-RECOVERED',
    name: 'ℹ️ Stonks: ERC1155 recovered',
    description: (args: EventArgs) =>
      `ERC1155 recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}\n` +
      `Amount: ${args.amount}\n` +
      `Stonks: ${etherscanAddress(address)}\n` +
      `From ${from} to ${to}`,
    severity: FindingSeverity.Info,
  })
  STONKS_EVENTS_OF_NOTICE.push({
    address,
    event: 'event EtherRecovered(address indexed recipient, uint256 amount)',
    alertId: 'STONKS-ETHER-RECOVERED',
    name: 'ℹ️ Stonks: Ether recovered',
    description: (args: EventArgs) =>
      `Ether recovered:\n` +
      `Requested by: ${etherscanAddress(args.recipient)}\n` +
      `Amount: ${args.amount}\n` +
      `Stonks: ${etherscanAddress(address)}\n` +
      `From ${from} to ${to}`,
    severity: FindingSeverity.Info,
  })
})
