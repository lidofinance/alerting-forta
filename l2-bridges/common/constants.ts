import { FindingSeverity, FindingType, Finding } from 'forta-agent'
import { EventOfNotice } from './entity/events'
import { getUniqueKey } from './utils/finding.helpers'
import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import { formatEther } from './utils/finding.helpers'

export const ETH_DECIMALS = new BigNumber(10).pow(18)
export const ETH_DECIMALS2 = 10n ** 18n
export const MAINNET_CHAIN_ID = 1
export const DRPC_URL = 'https://eth.drpc.org/'
export const L1_WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'
export const DEFAULT_ROLES_MAP: RoleHashToName = new Map<string, string>([
  ['0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a', 'DEPOSITS_ENABLER_ROLE'],
  ['0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6', 'DEPOSITS_DISABLER_ROLE'],
  ['0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d', 'WITHDRAWALS_ENABLER_ROLE'],
  ['0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c', 'WITHDRAWALS_DISABLER_ROLE'],
  ['0x0000000000000000000000000000000000000000000000000000000000000000', 'DEFAULT_ADMIN_ROLE'],
])
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const getHugeWithdrawalsFromL2AlertFactory = (l2Name: string, uniqueKey: string) => {
  return (params: HugeWithdrawalsFromL2AlertParams) => {
    ethers.utils.formatEther(params.withdrawalsSum)
    return Finding.fromObject({
      name: `⚠️ ${l2Name}: Huge withdrawals during the last ` + `${Math.floor(params.period / (60 * 60))} hour(s)`,
      description:
        `There were withdrawals requests from L2 to L1 for the ` +
        `${formatEther(params.withdrawalsSum, 4)} wstETH in total`,
      alertId: 'HUGE-WITHDRAWALS-FROM-L2',
      severity: FindingSeverity.Medium,
      type: FindingType.Suspicious,
      uniqueKey: getUniqueKey(uniqueKey, params.l2BlockNumber),
    })
  }
}

export type RoleHashToName = Map<string, string>

export type ContractInfo = {
  name: string
  address: string
}

export type TransparentProxyInfo = {
  name: string
  address: string
  proxyAdminAddress: string
}

export type WithdrawalInfo = {
  eventName: string,
  eventDefinition: string,  // e.g. "event WithdrawalEvent(address indexed l1token, ...)"
  amountFieldName: string, // e.g. "amount", according to the name of the field in the withdrawal event
}

export type HugeWithdrawalsFromL2AlertParams = {
  period: number,
  l2BlockNumber: number,
  withdrawalsSum: bigint,
}

export type Constants = {
  L2_NAME: string,
  L2_NETWORK_RPC: string,
  MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST: number,
  L2_NETWORK_ID: number,
  L2_APPROX_BLOCK_TIME_SECONDS: number,
  L2_PROXY_ADMIN_CONTRACT_ADDRESS: string,
  govExecutor: string | TransparentProxyInfo,
  L1_ERC20_TOKEN_GATEWAY_ADDRESS: string,
  L2_ERC20_TOKEN_GATEWAY: ContractInfo,
  L2_WSTETH_BRIDGED: ContractInfo | TransparentProxyInfo,
  rolesMap: RoleHashToName,
  withdrawalInfo: WithdrawalInfo,
  // bridgeEvents: EventOfNotice[],
  // govEvents: EventOfNotice[],
  // proxyAdminEvents: EventOfNotice[],
  getHugeWithdrawalsFromL2Alert: (params: HugeWithdrawalsFromL2AlertParams) => Finding,
}
