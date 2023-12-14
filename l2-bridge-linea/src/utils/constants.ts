export const LINEA_BRIDGE_EXECUTOR = '0x74Be82F00CC867614803ffd7f36A2a4aF0405670'

export const LINEA_L2_TOKEN_BRIDGE = '0x353012dc4a9a6cf55c941badc267f82004a8ceb9'

// WstETH ERC20Bridged
export const LINEA_WST_CUSTOM_BRIDGED_TOKEN = '0xB5beDd42000b71FddE22D3eE8a79Bd49A568fC8F'

export const WITHDRAWAL_INITIATED_EVENT =
  'event WithdrawalInitiated(address indexed _l1Token, address indexed _l2Token, address indexed _from, address _to, uint256 _amount, bytes _data)'

type ProxyContract = {
  name: string
  hash: string
}

export type L2_ERC20_TOKEN_GATEWAY_TYPE = ProxyContract
export type LINEA_WST_ETH_BRIDGED_TYPE = ProxyContract

export const LINEA_L2_ERC20_TOKEN_GATEWAY: L2_ERC20_TOKEN_GATEWAY_TYPE = {
  name: 'L2_ERC20_TOKEN_GATEWAY',
  hash: LINEA_L2_TOKEN_BRIDGE,
}

export const LINEA_WST_ETH_BRIDGED: LINEA_WST_ETH_BRIDGED_TYPE = {
  name: 'LINEA_WST_ETH_BRIDGED_ADDRESS',
  hash: LINEA_WST_CUSTOM_BRIDGED_TOKEN,
}
