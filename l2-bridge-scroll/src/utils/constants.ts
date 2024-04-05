export type ContractInfo = {
  name: string
  address: string
}

export type RoleHashToName = Map<string, string>

export const Constants = {
  L2_NETWORK_RPC: 'https://rpc.scroll.io',
  L2_NETWORK_ID: 534352,
  L2_PROXY_ADMIN_CONTRACT_ADDRESS: '0x8e34D07Eb348716a1f0a48A507A9de8a3A6DcE45',
  GOV_BRIDGE_ADDRESS: '0x0c67D8D067E349669dfEAB132A7c03A90594eE09',
  L2_ERC20_TOKEN_GATEWAY: {
    name: 'L2_ERC20_TOKEN_GATEWAY',
    address: '0x8aE8f22226B9d789A36AC81474e633f8bE2856c9',
  },
  SCROLL_WSTETH_BRIDGED: {
    name: 'SCROLL_WSTETH_BRIDGED',
    address: '0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32',
  },
  RolesMap: new Map<string, string>([
    ['0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a', 'DEPOSITS_ENABLER_ROLE'],
    ['0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6', 'DEPOSITS_DISABLER_ROLE'],
    ['0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d', 'WITHDRAWALS_ENABLER_ROLE'],
    ['0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c', 'WITHDRAWALS_DISABLER_ROLE'],
    ['0x0000000000000000000000000000000000000000000000000000000000000000', 'DEFAULT_ADMIN_ROLE'],
  ]),
}