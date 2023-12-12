import { Role, RoleAddress, RoleName } from '../entity/role'

export const GOV_BRIDGE_ADDRESS = '0x0E37599436974a25dDeEdF795C848d30Af46eaCF'

export const L2_ERC20_TOKEN_GATEWAY_ADDRESS =
  '0xac9D11cD4D7eF6e54F14643a393F68Ca014287AB'

// WstETH ERC20Bridged
export const BASE_WST_ETH_BRIDGED_ADDRESS =
  '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452'

export const WITHDRAWAL_INITIATED_EVENT =
  'event WithdrawalInitiated(address indexed _l1Token,address indexed _l2Token,address indexed _from,address _to,uint256 _amount,bytes _data)'

type ProxyContract = {
  name: string
  address: string
}

export type L2_ERC20_TOKEN_GATEWAY_TYPE = ProxyContract
export type BASE_WST_ETH_BRIDGED_TYPE = ProxyContract

export const L2_ERC20_TOKEN_GATEWAY: L2_ERC20_TOKEN_GATEWAY_TYPE = {
  name: 'L2_ERC20_TOKEN_GATEWAY',
  address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
}

export const BASE_WST_ETH_BRIDGED: BASE_WST_ETH_BRIDGED_TYPE = {
  name: 'BASE_WST_ETH_BRIDGED',
  address: BASE_WST_ETH_BRIDGED_ADDRESS,
}

export const DEPOSITS_DISABLER_ROLE: Role = {
  name: 'DEPOSITS DISABLER ROLE',
  address: '0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6',
}

export const DEPOSITS_ENABLER_ROLE: Role = {
  name: 'DEPOSITS ENABLER ROLE',
  address: '0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a',
}

export const WITHDRAWALS_ENABLER_ROLE: Role = {
  name: 'WITHDRAWALS ENABLER ROLE',
  address: '0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d',
}

export const WITHDRAWALS_DISABLER_ROLE: Role = {
  name: 'WITHDRAWALS DISABLER ROLE',
  address: '0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c',
}

export const DEFAULT_ADMIN_ROLE: Role = {
  name: 'DEFAULT ADMIN ROLE',
  address: '0x0000000000000000000000000000000000000000000000000000000000000000',
}

export const RolesAddrToNameMap = new Map<RoleAddress, RoleName>([
  [DEPOSITS_DISABLER_ROLE.address, DEPOSITS_DISABLER_ROLE.name],
  [DEPOSITS_ENABLER_ROLE.address, DEPOSITS_ENABLER_ROLE.name],
  [WITHDRAWALS_ENABLER_ROLE.address, WITHDRAWALS_ENABLER_ROLE.name],
  [WITHDRAWALS_DISABLER_ROLE.address, WITHDRAWALS_DISABLER_ROLE.name],
  [DEFAULT_ADMIN_ROLE.address, DEFAULT_ADMIN_ROLE.name],
])
