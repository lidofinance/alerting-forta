export interface Storage {
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
export const PERIODICAL_BLOCK_INTERVAL = (12 * 60 * 60) / SECONDS_PER_BLOCK
export const HOURS_24_IN_BLOCK = (24 * 60 * 60) / SECONDS_PER_BLOCK
export const HOURS_48_IN_BLOCK = 2 * HOURS_24_IN_BLOCK

export const WSTETH_ADDRESS = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'

export const MELLOW_VAULT_PROXY_ADDRESS = '0xed792a3fdeb9044c70c951260aaae974fb3db38f'
export const MELLOW_VAULT_PROXY_OWNER = '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0'

export const MELLOW_SYMBIOTIC_ADDRESS = '0xc329400492c6ff2438472d4651ad17389fcb843a'

export const STORAGE_MEV_CAP: Storage = {
  baseDelay: '2592000',
  depositCallbackDelay: '86400',
  withdrawalCallbackDelay: '86400',
  withdrawalFeeD9Delay: '2592000',
  maximalTotalSupplyDelay: '86400',
  isDepositLockedDelay: '3600',
  areTransfersLockedDelay: '31536000',
  ratiosOracleDelay: '2592000',
  priceOracleDelay: '2592000',
  validatorDelay: '2592000',
  emergencyWithdrawalDelay: '7776000',
  depositCallback: '0xc3a149b5ca3f4a5f17f5d865c14aa9dbb570f10a',
  withdrawalCallback: '0x0000000000000000000000000000000000000000',
  withdrawalFeeD9: '0',
  maximalTotalSupply: '10322500000000000000000',
  isDepositLocked: 'false',
  areTransfersLocked: 'false',
  ratiosOracle: '0x955ff4cc738cdc009d2903196d1c94c8cfb4d55d',
  priceOracle: '0x1dc89c28e59d142688d65bd7b22c4fd40c2cc06d',
  validator: '0xd2635fa0635126bafdd430b9614c0280d37a76ca',
}
export const STORAGE_P2P: Storage = {
  baseDelay: '2592000',
  depositCallbackDelay: '86400',
  withdrawalCallbackDelay: '86400',
  withdrawalFeeD9Delay: '2592000',
  maximalTotalSupplyDelay: '86400',
  isDepositLockedDelay: '3600',
  areTransfersLockedDelay: '31536000',
  ratiosOracleDelay: '2592000',
  priceOracleDelay: '2592000',
  validatorDelay: '2592000',
  emergencyWithdrawalDelay: '7776000',
  depositCallback: '0xa0ea6d4fe369104ed4cc18951b95c3a43573c0f6',
  withdrawalCallback: '0x0000000000000000000000000000000000000000',
  withdrawalFeeD9: '0',
  maximalTotalSupply: '10322500000000000000000',
  isDepositLocked: 'false',
  areTransfersLocked: 'false',
  ratiosOracle: '0x955ff4cc738cdc009d2903196d1c94c8cfb4d55d',
  priceOracle: '0x1dc89c28e59d142688d65bd7b22c4fd40c2cc06d',
  validator: '0x6ab116ac709c89d90cc1f8cd0323617a9996ba7c',
}
export const STORAGE_STEAKHOUSE: Storage = {
  baseDelay: '2592000',
  depositCallbackDelay: '86400',
  withdrawalCallbackDelay: '86400',
  withdrawalFeeD9Delay: '2592000',
  maximalTotalSupplyDelay: '86400',
  isDepositLockedDelay: '3600',
  areTransfersLockedDelay: '31536000',
  ratiosOracleDelay: '2592000',
  priceOracleDelay: '2592000',
  validatorDelay: '2592000',
  emergencyWithdrawalDelay: '7776000',
  depositCallback: '0x7a14b34a9a8ea235c66528dc3bf3aefc36dfc268',
  withdrawalCallback: '0x0000000000000000000000000000000000000000',
  withdrawalFeeD9: '0',
  maximalTotalSupply: '10322500000000000000000',
  isDepositLocked: 'false',
  areTransfersLocked: 'false',
  ratiosOracle: '0x955ff4cc738cdc009d2903196d1c94c8cfb4d55d',
  priceOracle: '0x1dc89c28e59d142688d65bd7b22c4fd40c2cc06d',
  validator: '0xdb66693845a3f72e932631080efb1a86536d0ea7',
}
export const STORAGE_RE7LABS: Storage = {
  baseDelay: '2592000',
  depositCallbackDelay: '86400',
  withdrawalCallbackDelay: '86400',
  withdrawalFeeD9Delay: '2592000',
  maximalTotalSupplyDelay: '86400',
  isDepositLockedDelay: '3600',
  areTransfersLockedDelay: '31536000',
  ratiosOracleDelay: '2592000',
  priceOracleDelay: '2592000',
  validatorDelay: '2592000',
  emergencyWithdrawalDelay: '7776000',
  depositCallback: '0xce3a8820265ad186e8c1ceaed16ae97176d020ba',
  withdrawalCallback: '0x0000000000000000000000000000000000000000',
  withdrawalFeeD9: '0',
  maximalTotalSupply: '10322500000000000000000',
  isDepositLocked: 'false',
  areTransfersLocked: 'false',
  ratiosOracle: '0x955ff4cc738cdc009d2903196d1c94c8cfb4d55d',
  priceOracle: '0x1dc89c28e59d142688d65bd7b22c4fd40c2cc06d',
  validator: '0x0483b89f632596b24426703e540e373083928a6a',
}

export const STORAGE_INFSTONES: Storage = {
  baseDelay: '2592000',
  depositCallbackDelay: '86400',
  withdrawalCallbackDelay: '86400',
  withdrawalFeeD9Delay: '2592000',
  maximalTotalSupplyDelay: '86400',
  isDepositLockedDelay: '3600',
  areTransfersLockedDelay: '31536000',
  ratiosOracleDelay: '2592000',
  priceOracleDelay: '2592000',
  validatorDelay: '2592000',
  emergencyWithdrawalDelay: '7776000',
  depositCallback: '0x20ad4d9bbbbbee7d3aba91558a02c17c3387b834',
  withdrawalCallback: '0x0000000000000000000000000000000000000000',
  withdrawalFeeD9: '0',
  maximalTotalSupply: '20000000000000000000000',
  isDepositLocked: 'false',
  areTransfersLocked: 'false',
  ratiosOracle: '0x955ff4cc738cdc009d2903196d1c94c8cfb4d55d',
  priceOracle: '0x1dc89c28e59d142688d65bd7b22c4fd40c2cc06d',
  validator: '0xa7a4411205ae15a7038cf443d03ad3e153ff70f1',
}
export const STORAGE_LUGA: Storage = {
  baseDelay: '2592000',
  depositCallbackDelay: '86400',
  withdrawalCallbackDelay: '86400',
  withdrawalFeeD9Delay: '2592000',
  maximalTotalSupplyDelay: '86400',
  isDepositLockedDelay: '3600',
  areTransfersLockedDelay: '31536000',
  ratiosOracleDelay: '2592000',
  priceOracleDelay: '2592000',
  validatorDelay: '2592000',
  emergencyWithdrawalDelay: '7776000',
  depositCallback: '0xa80575b793aabd32edb39759c975534d75a4a2a4',
  withdrawalCallback: '0x0000000000000000000000000000000000000000',
  withdrawalFeeD9: '0',
  maximalTotalSupply: '11000000000000000000000',
  isDepositLocked: 'false',
  areTransfersLocked: 'false',
  ratiosOracle: '0x955ff4cc738cdc009d2903196d1c94c8cfb4d55d',
  priceOracle: '0x1dc89c28e59d142688d65bd7b22c4fd40c2cc06d',
  validator: '0xdecdf29ad6424db3ffb607aa9b2d13129e2f4dd9',
}
export const STORAGE_CHORUS_ONE: Storage = {
  baseDelay: '2592000',
  depositCallbackDelay: '86400',
  withdrawalCallbackDelay: '86400',
  withdrawalFeeD9Delay: '2592000',
  maximalTotalSupplyDelay: '86400',
  isDepositLockedDelay: '3600',
  areTransfersLockedDelay: '31536000',
  ratiosOracleDelay: '2592000',
  priceOracleDelay: '2592000',
  validatorDelay: '2592000',
  emergencyWithdrawalDelay: '7776000',
  depositCallback: '0xe73c97e07df948a046505f8c63c4b54d632d4972',
  withdrawalCallback: '0x0000000000000000000000000000000000000000',
  withdrawalFeeD9: '0',
  maximalTotalSupply: '11000000000000000000000',
  isDepositLocked: 'false',
  areTransfersLocked: 'false',
  ratiosOracle: '0x955ff4cc738cdc009d2903196d1c94c8cfb4d55d',
  priceOracle: '0x1dc89c28e59d142688d65bd7b22c4fd40c2cc06d',
  validator: '0xa34721eb65ece9318cbef85b112e427598575a0a',
}
export const STORAGE_RENZO: Storage = {
  baseDelay: '2592000',
  depositCallbackDelay: '86400',
  withdrawalCallbackDelay: '86400',
  withdrawalFeeD9Delay: '2592000',
  maximalTotalSupplyDelay: '86400',
  isDepositLockedDelay: '3600',
  areTransfersLockedDelay: '31536000',
  ratiosOracleDelay: '2592000',
  priceOracleDelay: '2592000',
  validatorDelay: '2592000',
  emergencyWithdrawalDelay: '7776000',
  depositCallback: '0xe8206fbf2d9f9e7fbf2f7b997e20a34f9158cc14',
  withdrawalCallback: '0x0000000000000000000000000000000000000000',
  withdrawalFeeD9: '0',
  maximalTotalSupply: '25000000000000000000000',
  isDepositLocked: 'false',
  areTransfersLocked: 'false',
  ratiosOracle: '0x955ff4cc738cdc009d2903196d1c94c8cfb4d55d',
  priceOracle: '0x1dc89c28e59d142688d65bd7b22c4fd40c2cc06d',
  validator: '0x5523f92b532b9d723c393ca2cd7098b9d618a3e6',
}

export const ACL_ROLES = new Map<string, string>([
  ['0xc171260023d22a25a00a2789664c9334017843b831138c8ef03cc8897e5873d7', 'ADMIN DELEGATE ROLE'],
  ['0xf23ec0bb4210edd5cba85afd05127efcd2fc6a781bfed49188da1081670b22d8', 'ADMIN ROLE'],
  ['0x0000000000000000000000000000000000000000000000000000000000000000', 'DEFAULT ADMIN ROLE'],
  ['0x46a52cf33029de9f84853745a87af28464c80bf0346df1b32e205fc73319f622', 'OPERATOR'],
])

export const VAULT_STEAKHOUSE = {
  name: 'Steakhouse Vault',
  vault: '0xbeef69ac7870777598a04b2bd4771c71212e6abc',
  initializer: '0x39c62c6308bed7b0832cafc2bea0c0edc7f2060c',
  configurator: '0xe6180599432767081bea7deb76057ce5883e73be',
  validator: '0xdb66693845a3f72e932631080efb1a86536d0ea7',
  defaultBondStrategy: '0x7a14b34a9a8ea235c66528dc3bf3aefc36dfc268',
  depositWrapper: '0x24fee15bc11ff617c042283b58a3bda6441da145',
  upgradeableProxyProxyAdmin: '0xed792a3fdeb9044c70c951260aaae974fb3db38f',
  deployer: '0x188858ac61a74350116d1cb6958fbc509fd6afa1',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  storage: STORAGE_STEAKHOUSE,
  curator: '0x2afc096981c2cfe3501be4054160048718f6c0c8',
}
export const VAULT_RE7LABS = {
  name: 'Re7 Vault',
  vault: '0x84631c0d0081fde56deb72f6de77abbbf6a9f93a',
  initializer: '0x39c62c6308bed7b0832cafc2bea0c0edc7f2060c',
  configurator: '0x214d66d110060da2848038ca0f7573486363cae4',
  validator: '0x0483b89f632596b24426703e540e373083928a6a',
  defaultBondStrategy: '0xce3a8820265ad186e8c1ceaed16ae97176d020ba',
  depositWrapper: '0x70cd3464a41b6692413a1ba563b9d53955d5de0d',
  upgradeableProxyProxyAdmin: '0xf076cf343dcfd01bba57dfeb5c74f7b015951fcf',
  deployer: '0x188858ac61a74350116d1cb6958fbc509fd6afa1',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  storage: STORAGE_RE7LABS,
  curator: '0xe86399fe6d7007fdecb08a2ee1434ee677a04433',
}
export const VAULT_MEV_CAP = {
  name: 'Mev Capital Vault',
  vault: '0x5fd13359ba15a84b76f7f87568309040176167cd',
  initializer: '0x39c62c6308bed7b0832cafc2bea0c0edc7f2060c',
  configurator: '0x2dec4fdc225c1f71161ea481e23d66feaaae2391',
  validator: '0xd2635fa0635126bafdd430b9614c0280d37a76ca',
  defaultBondStrategy: '0xc3a149b5ca3f4a5f17f5d865c14aa9dbb570f10a',
  depositWrapper: '0xdc1741f9bd33dd791942cc9435a90b0983de8665',
  upgradeableProxyProxyAdmin: '0xc24891b75ef55fedc377c5e6ec59a850b12e23ac',
  deployer: '0x188858ac61a74350116d1cb6958fbc509fd6afa1',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  storage: STORAGE_MEV_CAP,
  curator: '0xa1e38210b06a05882a7e7bfe167cd67f07fa234a',
}
export const VAULT_P2P = {
  name: 'P2P Vault',
  vault: '0x7a4effd87c2f3c55ca251080b1343b605f327e3a',
  initializer: '0x39c62c6308bed7b0832cafc2bea0c0edc7f2060c',
  configurator: '0x84b240e99d4c473b5e3df1256300e2871412ddfe',
  validator: '0x6ab116ac709c89d90cc1f8cd0323617a9996ba7c',
  defaultBondStrategy: '0xa0ea6d4fe369104ed4cc18951b95c3a43573c0f6',
  depositWrapper: '0x41a1fbea7ace3c3a6b66a73e96e5ed07cdb2a34d',
  upgradeableProxyProxyAdmin: '0x17ac6a90ed880f9ce54bb63dab071f2bd3fe3772',
  deployer: '0x188858ac61a74350116d1cb6958fbc509fd6afa1',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  storage: STORAGE_P2P,
  curator: '0x4a3c7f2470aa00ebe6ae7cb1faf95964b9de1ef4',
}

export const VAULT_INFSTONES = {
  name: 'InfStones Restaked ETH Vault',
  vault: '0x49cd586dd9ba227be9654c735a659a1db08232a9',
  initializer: '0x39c62c6308bed7b0832cafc2bea0c0edc7f2060c',
  configurator: '0x9c49a829f1d726679cb505439bbf3ed018a7e9c6',
  validator: '0xa7a4411205ae15a7038cf443d03ad3e153ff70f1',
  defaultBondStrategy: '0x20ad4d9bbbbbee7d3aba91558a02c17c3387b834',
  depositWrapper: '0x6371ca27b6c9145408909e94ff5fbb755360b914',
  upgradeableProxyProxyAdmin: '0xd09b3193bb71b98027dd0f1a34eeaebd04b2e47c',
  deployer: '0x188858ac61a74350116d1cb6958fbc509fd6afa1',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  storage: STORAGE_INFSTONES,
  curator: '0xd3895c43e886778e7e1e099c280a8c5aa5b2a4d8',
}
export const VAULT_LUGA = {
  name: 'LugaETH Vault',
  vault: '0x82dc3260f599f4fc4307209a1122b6eaa007163b',
  initializer: '0x39c62c6308bed7b0832cafc2bea0c0edc7f2060c',
  configurator: '0x3fbbfad187de801e4736f89599b943a1de127db8',
  validator: '0xdecdf29ad6424db3ffb607aa9b2d13129e2f4dd9',
  defaultBondStrategy: '0xa80575b793aabd32edb39759c975534d75a4a2a4',
  depositWrapper: '0x9e03e503fd67c06d9ee5c890696bdb58c60a86cc',
  upgradeableProxyProxyAdmin: '0x3c1c6a3e94bc607ac947d4520e2e9161a4183d4d',
  deployer: '0x188858ac61a74350116d1cb6958fbc509fd6afa1',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  storage: STORAGE_LUGA,
  curator: '0x1fbbc71b60a499c09d454725acf1d6931515671a',
}
export const VAULT_CHORUS_ONE = {
  name: 'Chorus One Restaking ETH Vault',
  vault: '0xd6e09a5e6d719d1c881579c9c8670a210437931b',
  initializer: '0x39c62c6308bed7b0832cafc2bea0c0edc7f2060c',
  configurator: '0xdaaab1a2022bc2040d4e28bd9b80cbb6f69663a4',
  validator: '0xa34721eb65ece9318cbef85b112e427598575a0a',
  defaultBondStrategy: '0xe73c97e07df948a046505f8c63c4b54d632d4972',
  depositWrapper: '0x760d48996ffbce4ab52b4c503c57d67aa63a39fe',
  upgradeableProxyProxyAdmin: '0x0375178c4d752b3ae35d806c6bb60d07faecba5e',
  deployer: '0x188858ac61a74350116d1cb6958fbc509fd6afa1',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  storage: STORAGE_CHORUS_ONE,
  curator: '0x3ea145d6cea2e939d866ba71136dca6a1b96919f',
}
export const VAULT_RENZO = {
  name: 'Renzo Restaked Vault',
  vault: '0x8c9532a60e0e7c6bbd2b2c1303f63ace1c3e9811',
  initializer: '0x39c62c6308bed7b0832cafc2bea0c0edc7f2060c',
  configurator: '0xb1b912be63a2dc4ecf5a6bfad46780dd7f81022b',
  validator: '0x5523f92b532b9d723c393ca2cd7098b9d618a3e6',
  defaultBondStrategy: '0xe8206fbf2d9f9e7fbf2f7b997e20a34f9158cc14',
  depositWrapper: '0x897642a9dbe1dd82acfdb90d1f22f75b66a765ba',
  upgradeableProxyProxyAdmin: '0x985e459801d37749c331bbd2673b665b9114fb01',
  deployer: '0x188858ac61a74350116d1cb6958fbc509fd6afa1',
  proxyAdmin: '0x81698f87c6482bf1ce9bfcfc0f103c4a0adf0af0',
  admin: '0x9437b2a8cf3b69d782a61f9814baabc172f72003',
  storage: STORAGE_RENZO,
  curator: '0x6e5cad73d00bc8340f38afb61fc5e34f7193f599',
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
