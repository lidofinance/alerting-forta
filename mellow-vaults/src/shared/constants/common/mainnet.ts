export interface VaultConfig {
  baseDelay?: string
  depositCallbackDelay?: string
  withdrawalCallbackDelay?: string
  withdrawalFeeD9Delay?: string
  maximalTotalSupplyDelay?: string
  isDepositLockedDelay?: string
  areTransfersLockedDelay?: string
  ratiosOracleDelay?: string
  priceOracleDelay?: string
  validatorDelay?: string
  emergencyWithdrawalDelay?: string
  depositCallback?: string
  withdrawalCallback?: string
  withdrawalFeeD9?: string
  maximalTotalSupply?: string
  isDepositLocked?: string
  areTransfersLocked?: string
  ratiosOracle?: string
  priceOracle?: string
  validator?: string
}
export const VAULT_WATCH_METHOD_NAMES = [
  'baseDelay',
  'depositCallbackDelay',
  'withdrawalCallbackDelay',
  'withdrawalFeeD9Delay',
  'maximalTotalSupplyDelay',
  'isDepositLockedDelay',
  'areTransfersLockedDelay',
  'ratiosOracleDelay',
  'priceOracleDelay',
  'validatorDelay',
  'emergencyWithdrawalDelay',
  'depositCallback',
  'withdrawalCallback',
  'withdrawalFeeD9',
  'maximalTotalSupply',
  'isDepositLocked',
  'areTransfersLocked',
  'ratiosOracle',
  'priceOracle',
  'validator',
] as const

export interface SafeTX {
  safeAddress: string
  safeName: string
  tx: string
  safeTx: string
}

export interface BlockchainInfo {
  addressUrlPrefix: string
  txUrlPrefix: string
  safeTxUrlPrefix: string
  safeUrlPrefix: string
}

export const BLOCKCHAIN_INFO: BlockchainInfo = {
  addressUrlPrefix: 'https://etherscan.io/address/',
  txUrlPrefix: 'https://etherscan.io/tx/',
  safeTxUrlPrefix: 'https://app.safe.global/transactions/tx?safe=eth:',
  safeUrlPrefix: 'https://app.safe.global/home?safe=eth:',
}
const SECONDS_PER_BLOCK = 12
export const MINUTE_IN_BLOCK = 60 / SECONDS_PER_BLOCK
export const PERIODICAL_BLOCK_INTERVAL = 12 * 60 * MINUTE_IN_BLOCK
export const HOURS_24_IN_BLOCK = 24 * 60 * MINUTE_IN_BLOCK
export const HOURS_48_IN_BLOCK = 2 * HOURS_24_IN_BLOCK

export const WSTETH_ADDRESS = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'

export const MELLOW_VAULT_PROXY_ADDRESS = '0xed792a3fdeb9044c70c951260aaae974fb3db38f'
export const MELLOW_VAULT_PROXY_OWNER = '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0'

export const MELLOW_SYMBIOTIC_ADDRESS = '0xc329400492c6ff2438472d4651ad17389fcb843a'

export const ACL_ROLES = new Map<string, string>([
  ['0xc171260023d22a25a00a2789664c9334017843b831138c8ef03cc8897e5873d7', 'ADMIN DELEGATE ROLE'],
  ['0xf23ec0bb4210edd5cba85afd05127efcd2fc6a781bfed49188da1081670b22d8', 'ADMIN ROLE'],
  ['0x0000000000000000000000000000000000000000000000000000000000000000', 'DEFAULT ADMIN ROLE'],
  ['0x46a52cf33029de9f84853745a87af28464c80bf0346df1b32e205fc73319f622', 'OPERATOR'],
])

export const VAULT_STEAKHOUSE = {
  name: 'Steakhouse Vault',
  vault: '0xbeef69ac7870777598a04b2bd4771c71212e6abc',
  configurator: '0xe6180599432767081bea7deb76057ce5883e73be',
  defaultBondStrategy: '0x7a14b34a9a8ea235c66528dc3bf3aefc36dfc268',
  upgradeableProxyProxyAdmin: '0xed792a3fdeb9044c70c951260aaae974fb3db38f',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0x2afc096981c2cfe3501be4054160048718f6c0c8',
}
export const VAULT_RE7LABS = {
  name: 'Re7 Vault',
  vault: '0x84631c0d0081fde56deb72f6de77abbbf6a9f93a',
  configurator: '0x214d66d110060da2848038ca0f7573486363cae4',
  defaultBondStrategy: '0xce3a8820265ad186e8c1ceaed16ae97176d020ba',
  upgradeableProxyProxyAdmin: '0xf076cf343dcfd01bba57dfeb5c74f7b015951fcf',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0xe86399fe6d7007fdecb08a2ee1434ee677a04433',
}
export const VAULT_MEV_CAP = {
  name: 'Mev Capital Vault',
  vault: '0x5fd13359ba15a84b76f7f87568309040176167cd',
  configurator: '0x2dec4fdc225c1f71161ea481e23d66feaaae2391',
  defaultBondStrategy: '0xc3a149b5ca3f4a5f17f5d865c14aa9dbb570f10a',
  upgradeableProxyProxyAdmin: '0xc24891b75ef55fedc377c5e6ec59a850b12e23ac',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0xa1e38210b06a05882a7e7bfe167cd67f07fa234a',
}
export const VAULT_P2P = {
  name: 'P2P Vault',
  vault: '0x7a4effd87c2f3c55ca251080b1343b605f327e3a',
  configurator: '0x84b240e99d4c473b5e3df1256300e2871412ddfe',
  defaultBondStrategy: '0xa0ea6d4fe369104ed4cc18951b95c3a43573c0f6',
  upgradeableProxyProxyAdmin: '0x17ac6a90ed880f9ce54bb63dab071f2bd3fe3772',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0x4a3c7f2470aa00ebe6ae7cb1faf95964b9de1ef4',
}

export const VAULT_INFSTONES = {
  name: 'InfStones Restaked ETH Vault',
  vault: '0x49cd586dd9ba227be9654c735a659a1db08232a9',
  configurator: '0x9c49a829f1d726679cb505439bbf3ed018a7e9c6',
  defaultBondStrategy: '0x20ad4d9bbbbbee7d3aba91558a02c17c3387b834',
  upgradeableProxyProxyAdmin: '0xd09b3193bb71b98027dd0f1a34eeaebd04b2e47c',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0xd3895c43e886778e7e1e099c280a8c5aa5b2a4d8',
}
export const VAULT_LUGA = {
  name: 'LugaETH Vault',
  vault: '0x82dc3260f599f4fc4307209a1122b6eaa007163b',
  configurator: '0x3fbbfad187de801e4736f89599b943a1de127db8',
  defaultBondStrategy: '0xa80575b793aabd32edb39759c975534d75a4a2a4',
  upgradeableProxyProxyAdmin: '0x3c1c6a3e94bc607ac947d4520e2e9161a4183d4d',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0x1fbbc71b60a499c09d454725acf1d6931515671a',
}
export const VAULT_CHORUS_ONE = {
  name: 'Chorus One Restaking ETH Vault',
  vault: '0xd6e09a5e6d719d1c881579c9c8670a210437931b',
  configurator: '0xdaaab1a2022bc2040d4e28bd9b80cbb6f69663a4',
  defaultBondStrategy: '0xe73c97e07df948a046505f8c63c4b54d632d4972',
  upgradeableProxyProxyAdmin: '0x0375178c4d752b3ae35d806c6bb60d07faecba5e',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0x3ea145d6cea2e939d866ba71136dca6a1b96919f',
}
export const VAULT_RENZO = {
  name: 'Renzo Restaked Vault',
  vault: '0x8c9532a60e0e7c6bbd2b2c1303f63ace1c3e9811',
  configurator: '0xb1b912be63a2dc4ecf5a6bfad46780dd7f81022b',
  defaultBondStrategy: '0xe8206fbf2d9f9e7fbf2f7b997e20a34f9158cc14',
  upgradeableProxyProxyAdmin: '0x985e459801d37749c331bbd2673b665b9114fb01',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0x6e5cad73d00bc8340f38afb61fc5e34f7193f599',
}
export const VAULT_DVSTETH = {
  name: 'Decentralized Validator Token',
  vault: '0x5e362eb2c0706bd1d134689ec75176018385430b',
  configurator: '0xdee41701310f48744e6bb4a5df6b5e714ce49133',
  defaultBondStrategy: '0x078b1c03d14652bfeedfadf7985fdf2d8a2e8108',
  upgradeableProxyProxyAdmin: '0x8e6c80c41450d3fa7b1fd0196676b99bfb34bf48',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  curator: '0x2afc096981c2cfe3501be4054160048718f6c0c8',
}

export const MELLOW_VAULT_ADMIN_MULTISIGS = [
  ['0x9437b2a8cf3b69d782a61f9814baabc172f72003', 'Mellow Vaults Admin multisig'],
]

export const VAULT_LIST = [
  VAULT_STEAKHOUSE,
  VAULT_RE7LABS,
  VAULT_MEV_CAP,
  VAULT_P2P,
  VAULT_INFSTONES,
  VAULT_LUGA,
  VAULT_CHORUS_ONE,
  VAULT_RENZO,
]
