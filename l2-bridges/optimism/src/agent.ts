import { App } from '../../common/agent'
import { Constants, DEFAULT_ROLES_MAP, getHugeWithdrawalsFromL2AlertFactory } from '../../common/constants'

const L2_NAME = 'Optimism'
export const optimismConstants: Constants = {
  L2_NAME: L2_NAME,
  L2_NETWORK_RPC: 'https://mainnet.optimism.io',
  MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST: 10_000,
  L2_NETWORK_ID: 10,
  L2_APPROX_BLOCK_TIME_SECONDS: 2, // exactly two secs for Optimism
  L2_PROXY_ADMIN_CONTRACT_ADDRESS: '', // TODO
  govExecutor: '0xefa0db536d2c8089685630fafe88cf7805966fc3',
  L1_ERC20_TOKEN_GATEWAY_ADDRESS: '0x76943c0d61395d8f2edf9060e1533529cae05de6',
  L2_ERC20_TOKEN_GATEWAY: {
    name: 'L2_ERC20_TOKEN_GATEWAY',
    address: '0x8e01013243a96601a86eb3153f0d9fa4fbfb6957',
  },
  L2_WSTETH_BRIDGED: {
    name: 'OPTIMISM_WSTETH_BRIDGED',
    address: '0x1f32b1c2345538c0c6f582fcb022739c4a194ebb',
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
  getHugeWithdrawalsFromL2Alert: getHugeWithdrawalsFromL2AlertFactory(
    L2_NAME, `B833CDC4-7661-46E2-AD6C-F5A71277EBD5`
  ),
}


export default {
  initialize: App.initializeStatic(optimismConstants),
  handleBlock: App.handleBlockStatic,
}
