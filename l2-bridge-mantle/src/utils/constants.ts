import { Role, RoleHash, RoleName } from '../entity/role'

export const GOV_BRIDGE_ADDRESS = '0x3a7b055bf88cdc59d20d0245809c6e6b3c5819dd'

export const L2_ERC20_TOKEN_GATEWAY_ADDRESS = '0x9c46560D6209743968cC24150893631A39AfDe4d'

// WstETH ERC20Bridged
export const MANTLE_WST_ETH_BRIDGED_ADDRESS = '0x458ed78EB972a369799fb278c0243b25e5242A83'

export const WITHDRAWAL_INITIATED_EVENT =
  'event WithdrawalInitiated( address indexed _l1Token, address indexed _l2Token, address indexed _from, address _to, uint256 _amount, bytes _data)'

type ProxyContract = {
  name: string
  hash: string
}

export type L2_ERC20_TOKEN_GATEWAY_TYPE = ProxyContract
export type MANTLE_WST_ETH_BRIDGED_TYPE = ProxyContract

export const L2_ERC20_TOKEN_GATEWAY: L2_ERC20_TOKEN_GATEWAY_TYPE = {
  name: 'L2_ERC20_TOKEN_GATEWAY',
  hash: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
}

export const MANTLE_WST_ETH_BRIDGED: MANTLE_WST_ETH_BRIDGED_TYPE = {
  name: 'MANTLE_WST_ETH_BRIDGED_ADDRESS',
  hash: MANTLE_WST_ETH_BRIDGED_ADDRESS,
}

export const DEPOSITS_DISABLER_ROLE: Role = {
  name: 'DEPOSITS DISABLER ROLE',
  hash: '0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6',
}

export const DEPOSITS_ENABLER_ROLE: Role = {
  name: 'DEPOSITS ENABLER ROLE',
  hash: '0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a',
}

export const WITHDRAWALS_ENABLER_ROLE: Role = {
  name: 'WITHDRAWALS ENABLER ROLE',
  hash: '0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d',
}

export const WITHDRAWALS_DISABLER_ROLE: Role = {
  name: 'WITHDRAWALS DISABLER ROLE',
  hash: '0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c',
}

// TODO ask
export const DEFAULT_ADMIN_ROLE: Role = {
  name: 'DEFAULT ADMIN ROLE',
  hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
}

export const RolesAddrToNameMap = new Map<RoleHash, RoleName>([
  [DEPOSITS_DISABLER_ROLE.hash, DEPOSITS_DISABLER_ROLE.name],
  [DEPOSITS_ENABLER_ROLE.hash, DEPOSITS_ENABLER_ROLE.name],
  [WITHDRAWALS_ENABLER_ROLE.hash, WITHDRAWALS_ENABLER_ROLE.name],
  [WITHDRAWALS_DISABLER_ROLE.hash, WITHDRAWALS_DISABLER_ROLE.name],
  [DEFAULT_ADMIN_ROLE.hash, DEFAULT_ADMIN_ROLE.name],
])
