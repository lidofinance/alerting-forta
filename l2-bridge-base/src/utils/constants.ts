export type RoleHashToName = Map<string, string>

export type OProxyContract = {
  name: string
  address: string
}

export type L2_ERC20_TOKEN_GATEWAY_TYPE = OProxyContract
export type BASE_WST_ETH_BRIDGED_TYPE = OProxyContract

export type Address = {
  GOV_BRIDGE_ADDRESS: string
  L2_ERC20_TOKEN_GATEWAY_ADDRESS: string
  BASE_WST_ETH_BRIDGED_ADDRESS: string
  L2_ERC20_TOKEN_GATEWAY: L2_ERC20_TOKEN_GATEWAY_TYPE
  BASE_WST_ETH_BRIDGED: BASE_WST_ETH_BRIDGED_TYPE
  RolesMap: RoleHashToName
}

const GOV_BRIDGE_ADDRESS: string = '0x0E37599436974a25dDeEdF795C848d30Af46eaCF'
const L2_ERC20_TOKEN_GATEWAY_ADDRESS: string = '0xac9D11cD4D7eF6e54F14643a393F68Ca014287AB'
const BASE_WST_ETH_BRIDGED_ADDRESS: string = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452'
const DEPOSITS_DISABLER_ROLE_HASH: string = '0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6'
const DEPOSITS_ENABLER_ROLE_HASH: string = '0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a'
const WITHDRAWALS_ENABLER_ROLE_HASH: string = '0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d'
const WITHDRAWALS_DISABLER_ROLE_HASH: string = '0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c'
const DEFAULT_ADMIN_ROLE_HASH: string = '0x0000000000000000000000000000000000000000000000000000000000000000'

export const Address: Address = {
  GOV_BRIDGE_ADDRESS: GOV_BRIDGE_ADDRESS,
  L2_ERC20_TOKEN_GATEWAY_ADDRESS: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
  BASE_WST_ETH_BRIDGED_ADDRESS: BASE_WST_ETH_BRIDGED_ADDRESS,
  L2_ERC20_TOKEN_GATEWAY: {
    name: 'L2_ERC20_TOKEN_GATEWAY',
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
  },
  BASE_WST_ETH_BRIDGED: {
    name: 'BASE_WST_ETH_BRIDGED',
    address: BASE_WST_ETH_BRIDGED_ADDRESS,
  },
  RolesMap: new Map<string, string>([
    [DEPOSITS_ENABLER_ROLE_HASH, 'DEPOSITS ENABLER ROLE'],
    [DEPOSITS_DISABLER_ROLE_HASH, 'DEPOSITS DISABLER ROLE'],
    [WITHDRAWALS_ENABLER_ROLE_HASH, 'WITHDRAWALS ENABLER ROLE'],
    [WITHDRAWALS_DISABLER_ROLE_HASH, 'WITHDRAWALS DISABLER ROLE'],
    [DEFAULT_ADMIN_ROLE_HASH, 'DEFAULT ADMIN ROLE'],
  ]),
}
