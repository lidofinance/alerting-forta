import { EventOfNotice } from './entity/events'

import BigNumber from 'bignumber.js'

export type WithdrawalInfo = {
  eventName: string,
  eventDefinition: string,  // e.g. "event WithdrawalEvent(address indexed l1token, ...)"
}

export const ETH_DECIMALS = new BigNumber(10).pow(18)
export const MAINNET_CHAIN_ID = 1
export const DRPC_URL = 'https://eth.drpc.org/'


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
  L1_WSTETH_ADDRESS: string,
  L1_ERC20_TOKEN_GATEWAY_ADDRESS: string,
  L2_ERC20_TOKEN_GATEWAY: {
    name: string,
    address: string,
  },
  L2_WSTETH_BRIDGED: {
    name: string,
    address: string,
  },
  RolesMap: RoleHashToName,
  withdrawalInfo: {
    eventName: string,
    eventDefinition: string,
  },
  getBridgeEvents: (l2GatewayAddress: string, RolesAddrToNameMap: RoleHashToName) => EventOfNotice[],
  getGovEvents: (GOV_BRIDGE_ADDRESS: string) => EventOfNotice[],
  getProxyAdminEvents: (l2WstethContract: ContractInfo, l2GatewayContract: ContractInfo) => EventOfNotice[],
}
