import BigNumber from 'bignumber.js'

export type RoleHashToNameMap = Map<string, string>

export type TProxyContract = {
  name: string
  proxyAdminAddress: string
  proxyAddress: string
}

export type OProxyContract = {
  name: string
  address: string
}

export const ETH_DECIMALS = new BigNumber(10).pow(18)

export type ZKSYNC_WSTETH_BRIDGED_UPGRADEABLE_TYPE = TProxyContract
export type ZKSYNC_BRIDGE_EXECUTOR_TYPE = TProxyContract
export type ZKSYNC_L2ERC20_TOKEN_BRIDGED_TYPE = OProxyContract

export type Address = {
  L1_WSTETH_ADDRESS: string
  ZKSYNC_GOV_EXECUTOR_ADDRESS: string
  ZKSYNC_L1ERC20_TOKEN_BRIDGE_ADDRESS: string
  ZKSYNC_L2ERC20_TOKEN_BRIDGE_ADDRESS: string
  PROXY_ADMIN_ADDRESS: string
  ZKSYNC_WSTETH_BRIDGED_ADDRESS: string
  ZKSYNC_WSTETH_BRIDGED: ZKSYNC_WSTETH_BRIDGED_UPGRADEABLE_TYPE
  ZKSYNC_BRIDGE_EXECUTOR: ZKSYNC_BRIDGE_EXECUTOR_TYPE
  ZKSYNC_L2ERC20_TOKEN_BRIDGED: ZKSYNC_L2ERC20_TOKEN_BRIDGED_TYPE
  RolesMap: RoleHashToNameMap
}

const L1_WSTETH_ADDRESS: string = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'
const ZKSYNC_GOV_EXECUTOR_ADDRESS: string = '0x139ee25dcad405d2a038e7a67f9ffdbf0f573f3c'
const ZKSYNC_L1ERC20_TOKEN_BRIDGED_ADDRESS: string = '0x41527b2d03844db6b0945f25702cb958b6d55989'
const ZKSYNC_L2ERC20_TOKEN_BRIDGED_ADDRESS: string = '0xe1d6a50e7101c8f8db77352897ee3f1ac53f782b'

const PROXY_ADMIN: string = '0xbd80e505ecc49bae2cc86094a78fa0e2db28b52a'
const ZKSYNC_WSTETH_BRIDGED: string = '0x703b52f2b28febcb60e1372858af5b18849fe867'

const DEPOSITS_DISABLER_ROLE_HASH: string = '0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6'
const DEPOSITS_ENABLER_ROLE_HASH: string = '0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a'
const WITHDRAWALS_ENABLER_ROLE_HASH: string = '0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d'
const WITHDRAWALS_DISABLER_ROLE_HASH: string = '0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c'
const DEFAULT_ADMIN_ROLE_HASH: string = '0x0000000000000000000000000000000000000000000000000000000000000000'

export const Address: Address = {
  L1_WSTETH_ADDRESS: L1_WSTETH_ADDRESS,
  ZKSYNC_GOV_EXECUTOR_ADDRESS: ZKSYNC_GOV_EXECUTOR_ADDRESS,
  ZKSYNC_L1ERC20_TOKEN_BRIDGE_ADDRESS: ZKSYNC_L1ERC20_TOKEN_BRIDGED_ADDRESS,
  ZKSYNC_L2ERC20_TOKEN_BRIDGE_ADDRESS: ZKSYNC_L2ERC20_TOKEN_BRIDGED_ADDRESS,
  ZKSYNC_WSTETH_BRIDGED_ADDRESS: ZKSYNC_WSTETH_BRIDGED,
  PROXY_ADMIN_ADDRESS: PROXY_ADMIN,
  ZKSYNC_WSTETH_BRIDGED: {
    name: `ZKSYNC_WSTETH_BRIDGED`,
    proxyAddress: ZKSYNC_WSTETH_BRIDGED,
    proxyAdminAddress: PROXY_ADMIN,
  },
  ZKSYNC_BRIDGE_EXECUTOR: {
    name: `ZKSYNC_GOV_EXECUTOR_ADDRESS`,
    proxyAddress: ZKSYNC_GOV_EXECUTOR_ADDRESS,
    proxyAdminAddress: PROXY_ADMIN,
  },
  ZKSYNC_L2ERC20_TOKEN_BRIDGED: {
    name: 'ZKSYNC_L2ERC20_TOKEN_BRIDGED_ADDRESS',
    address: ZKSYNC_L2ERC20_TOKEN_BRIDGED_ADDRESS,
  },
  RolesMap: new Map<string, string>([
    [DEPOSITS_ENABLER_ROLE_HASH, 'DEPOSITS ENABLER ROLE'],
    [DEPOSITS_DISABLER_ROLE_HASH, 'DEPOSITS DISABLER ROLE'],
    [WITHDRAWALS_ENABLER_ROLE_HASH, 'WITHDRAWALS ENABLER ROLE'],
    [WITHDRAWALS_DISABLER_ROLE_HASH, 'WITHDRAWALS DISABLER ROLE'],
    [DEFAULT_ADMIN_ROLE_HASH, 'DEFAULT ADMIN ROLE'],
  ]),
}
