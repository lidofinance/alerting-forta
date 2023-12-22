export const LINEA_BRIDGE_EXECUTOR = '0x74Be82F00CC867614803ffd7f36A2a4aF0405670'

export const LINEA_L2_TOKEN_BRIDGE = '0x353012dc4a9a6cf55c941badc267f82004a8ceb9'
export const ADMIN_OF_LINEA_L2_TOKEN_BRIDGE = '0xa11ba93afbd6d18e26fefdb2c6311da6c9b370d6'

// WstETH ERC20Bridged
export const LINEA_WST_CUSTOM_BRIDGED_TOKEN = '0xB5beDd42000b71FddE22D3eE8a79Bd49A568fC8F'
export const LINEA_PROXY_ADMIN_FOR_WSTETH = '0xF951d7592e03eDB0Bab3D533935e678Ce64Eb927'

export const LINEA_TOKEN_BRIDGE = '0x2bfdf4a0d54c93a4baf74f8dcea8a275d8ee97a9'

export const BRIDGING_INITIATED_EVENT =
  'event BridgingInitiated(address indexed sender, address recipient, address indexed token, uint256 indexed amount)'

type ProxyContract = {
  name: string
  hash: string
}

export type L2_ERC20_TOKEN_BRIDGE_TYPE = ProxyContract
export type LINEA_WST_CUSTOM_BRIDGED_TYPE = ProxyContract

export const LINEA_L2_ERC20_TOKEN_BRIDGE: L2_ERC20_TOKEN_BRIDGE_TYPE = {
  name: 'L2_ERC20_TOKEN_BRIDGE',
  hash: LINEA_L2_TOKEN_BRIDGE,
}

export const LINEA_WST_CUSTOM_BRIDGED: LINEA_WST_CUSTOM_BRIDGED_TYPE = {
  name: 'LINEA_WST_ETH_BRIDGED_ADDRESS',
  hash: LINEA_WST_CUSTOM_BRIDGED_TOKEN,
}
