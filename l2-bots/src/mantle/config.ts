import 'dotenv/config'
import { Constants, DEFAULT_ROLES_MAP, getHugeWithdrawalsFromL2AlertFactory, COMMON_CONFIG } from '../common/constants'

const L2_NAME = 'Mantle'

export const mantleConstants: Constants = {
  ...COMMON_CONFIG,
  APP_NAME: `l2-${L2_NAME.toLowerCase()}`, // used for metrics and production env
  L2_NAME: L2_NAME,
  L2_NETWORK_RPC: process.env.L2_RPC_URL || 'https://rpc.mantle.xyz',
  MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST: 10_000,
  L2_NETWORK_ID: 5000,
  L2_APPROX_BLOCK_TIME_SECONDS: 2,
  L2_PROXY_ADMIN_CONTRACT_ADDRESS: '0x8e34d07eb348716a1f0a48a507a9de8a3a6dce45',
  govExecutor: '0x3a7b055bf88cdc59d20d0245809c6e6b3c5819dd',
  L1_ERC20_TOKEN_GATEWAY_ADDRESS: '0x2D001d79E5aF5F65a939781FE228B267a8Ed468B',
  L2_ERC20_TOKEN_GATEWAY: {
    name: 'L2_ERC20_TOKEN_GATEWAY',
    address: '0x9c46560D6209743968cC24150893631A39AfDe4d',
  },
  L2_WSTETH_BRIDGED: {
    name: 'MANTLE_WSTETH_BRIDGED',
    address: '0x458ed78EB972a369799fb278c0243b25e5242A83',
  },
  rolesMap: DEFAULT_ROLES_MAP,
  withdrawalInfo: {
    eventName: 'WithdrawalInitiated',
    eventDefinition: `event WithdrawalInitiated(
    address indexed _l1Token,
    address indexed _l2Token,
    address indexed _from,
    address _to,
    uint256 _amount,
    bytes _data
)`,
    amountFieldName: "_amount",
  },
  // bridgeEvents: [],
  // govEvents: [],
  // proxyAdminEvents: [],
  getHugeWithdrawalsFromL2Alert: getHugeWithdrawalsFromL2AlertFactory(
    L2_NAME, `51F04709-7E86-4FB3-B53C-24C53C99DA24`
  ),
}
