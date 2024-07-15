import { EventOfNotice } from './entity/events'

import BigNumber from 'bignumber.js'

export type WithdrawalInfo = {
  eventName: string,
  eventDefinition: string,  // e.g. "event WithdrawalEvent(address indexed l1token, ...)"
  amountFieldName: string, // e.g. "amount", according to the name of the field in the withdrawal event
}

export const ETH_DECIMALS = new BigNumber(10).pow(18)
export const MAINNET_CHAIN_ID = 1
export const DRPC_URL = 'https://eth.drpc.org/'
export const L1_WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'

export type RoleHashToName = Map<string, string>
export type ContractInfo = {
  name: string
  address: string
}

export type Constants = {
  L2_NAME: string,
  L2_NETWORK_RPC: string,
  MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST: number,
  L2_NETWORK_ID: number,
  L2_APPROX_BLOCK_TIME_SECONDS: number,
  L2_PROXY_ADMIN_CONTRACT_ADDRESS: string,
  GOV_BRIDGE_ADDRESS: string,
  L1_ERC20_TOKEN_GATEWAY_ADDRESS: string,
  L2_ERC20_TOKEN_GATEWAY: ContractInfo,
  L2_WSTETH_BRIDGED: ContractInfo,
  RolesMap: RoleHashToName,
  withdrawalInfo: WithdrawalInfo,
  getBridgeEvents: (l2GatewayAddress: string, RolesAddrToNameMap: RoleHashToName) => EventOfNotice[],
  getGovEvents: (GOV_BRIDGE_ADDRESS: string) => EventOfNotice[],
  getProxyAdminEvents: (l2WstethContract: ContractInfo, l2GatewayContract: ContractInfo) => EventOfNotice[],
}
