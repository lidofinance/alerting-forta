// ADDRESSES

// Lido Core Protocol
export const LIDO_STETH_ADDRESS = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'
export const WSTETH_ADDRESS = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'

export type Storage = {
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

export const STORAGE_P2P = {
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

export const STORAGE_STEAKHOUSE = {
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

export const STORAGE_RE7LABS = {
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
}

export const VAULT_LIST = [VAULT_STEAKHOUSE, VAULT_RE7LABS, VAULT_MEV_CAP, VAULT_P2P]
