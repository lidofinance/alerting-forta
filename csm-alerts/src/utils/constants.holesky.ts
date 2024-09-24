// HOLESKY COMMON ADDRESSES

export type DeploymentAddress = {
  CS_MODULE_ADDRESS: string
  CS_ACCOUNTING_ADDRESS: string
  CS_FEE_DISTRIBUTOR_ADDRESS: string
  CS_FEE_ORACLE_ADDRESS: string
  CS_VERIFIER_ADDRESS: string
  CS_EARLY_ADOPTION_ADDRESS: string
  CSM_GATE_SEAL_ADDRESS: string
  LIDO_STETH_ADDRESS: string
  BURNER_ADDRESS: string
  HASH_CONSENSUS_ADDRESS: string
  STAKING_ROUTER_ADDRESS: string
  RolesMap: Map<string, string>
}

const DEFAULT_ADMIN_ROLE_HASH: string = '0x0000000000000000000000000000000000000000000000000000000000000000'
const PAUSE_ROLE_HASH: string = '0x139c2898040ef16910dc9f44dc697df79363da767d8bc92f2e310312b816e46d'
const RESUME_ROLE_HASH: string = '0x2fc10cc8ae19568712f7a176fb4978616a610650813c9d05326c34abb62749c7'
const STAKING_ROUTER_ROLE_HASH: string = '0xbb75b874360e0bfd87f964eadd8276d8efb7c942134fc329b513032d0803e0c6'
const MODULE_MANAGER_ROLE_HASH: string = '0x79dfcec784e591aafcf60db7db7b029a5c8b12aac4afd4e8c4eb740430405fa6'
const REPORT_EL_REWARDS_STEALING_PENALTY_ROLE_HASH: string =
  '0x59911a6aa08a72fe3824aec4500dc42335c6d0702b6d5c5c72ceb265a0de9302'
const SETTLE_EL_REWARDS_STEALING_PENALTY_ROLE_HASH: string =
  '0xe85fdec10fe0f93d0792364051df7c3d73e37c17b3a954bffe593960e3cd3012'
const VERIFIER_ROLE_HASH: string = '0x0ce23c3e399818cfee81a7ab0880f714e53d7672b08df0fa62f2843416e1ea09'
const RECOVERER_ROLE_HASH: string = '0xb3e25b5404b87e5a838579cb5d7481d61ad96ee284d38ec1e97c07ba64e7f6fc'
const ACCOUNTING_MANAGER_ROLE_HASH: string = '0x40579467dba486691cc62fd8536d22c6d4dc9cdc7bc716ef2518422aa554c098'
const MANAGE_BOND_CURVES_ROLE_HASH: string = '0xd35e4a788498271198ec69c34f1dc762a1eee8200c111f598da1b3dde946783d'
const SET_BOND_CURVE_ROLE_HASH: string = '0x645c9e6d2a86805cb5a28b1e4751c0dab493df7cf935070ce405489ba1a7bf72'
const RESET_BOND_CURVE_ROLE_HASH: string = '0xb5dffea014b759c493d63b1edaceb942631d6468998125e1b4fe427c99082134'
const CONTRACT_MANAGER_ROLE_HASH: string = '0x8135f02737a6b32709c1f229001b55183df0d6abcb3022e8bae091ad43fd9e6d'
const SUBMIT_DATA_ROLE_HASH: string = '0x65fa0c17458517c727737e4153dd477fa3e328cf706640b0f68b1a285c5990da'

export const DeploymentAddresses: DeploymentAddress = {
  CS_MODULE_ADDRESS: '0x4562c3e63c2e586cD1651B958C22F88135aCAd4f',
  CS_ACCOUNTING_ADDRESS: '0xc093e53e8F4b55A223c18A2Da6fA00e60DD5EFE1',
  CS_FEE_DISTRIBUTOR_ADDRESS: '0xD7ba648C8F72669C6aE649648B516ec03D07c8ED',
  CS_FEE_ORACLE_ADDRESS: '0xaF57326C7d513085051b50912D51809ECC5d98Ee',
  CS_VERIFIER_ADDRESS: '0x6DcA479178E6Ae41CCEB72a88FfDaa3e10E83CB7',
  CS_EARLY_ADOPTION_ADDRESS: '0x71E92eA77C198a770d9f33A03277DbeB99989660',
  CSM_GATE_SEAL_ADDRESS: '0x41F2677fae0222cF1f08Cd1c0AAa607B469654Ce',
  LIDO_STETH_ADDRESS: '0x3F1c547b21f65e10480dE3ad8E19fAAC46C95034',
  BURNER_ADDRESS: '0x4E46BD7147ccf666E1d73A3A456fC7a68de82eCA',
  HASH_CONSENSUS_ADDRESS: '0xbF38618Ea09B503c1dED867156A0ea276Ca1AE37',
  STAKING_ROUTER_ADDRESS: '0xd6EbF043D30A7fe46D1Db32BA90a0A51207FE229',
  RolesMap: new Map<string, string>([
    [DEFAULT_ADMIN_ROLE_HASH, 'DEFAULT ADMIN ROLE'],
    [PAUSE_ROLE_HASH, 'PAUSE ROLE'],
    [RESUME_ROLE_HASH, 'RESUME ROLE'],
    [MODULE_MANAGER_ROLE_HASH, 'MODULE MANAGER ROLE'],
    [STAKING_ROUTER_ROLE_HASH, 'STAKING ROUTER ROLE'],
    [REPORT_EL_REWARDS_STEALING_PENALTY_ROLE_HASH, 'REPORT EL REWARDS STEALING PENALTY ROLE'],
    [SETTLE_EL_REWARDS_STEALING_PENALTY_ROLE_HASH, 'SETTLE EL REWARDS STEALING PENALTY ROLE'],
    [VERIFIER_ROLE_HASH, 'VERIFIER ROLE'],
    [RECOVERER_ROLE_HASH, 'RECOVERER ROLE'],
    [ACCOUNTING_MANAGER_ROLE_HASH, 'ACCOUNTING MANAGER ROLE'],
    [MANAGE_BOND_CURVES_ROLE_HASH, 'MANAGE BOND CURVES ROLE'],
    [SET_BOND_CURVE_ROLE_HASH, 'SET BOND CURVE ROLE'],
    [RESET_BOND_CURVE_ROLE_HASH, 'RESET BOND CURVE ROLE'],
    [CONTRACT_MANAGER_ROLE_HASH, 'CONTRACT MANAGER ROLE'],
    [SUBMIT_DATA_ROLE_HASH, 'SUBMIT DATA ROLE'],
  ]),
}
export interface Proxy {
  name: string
  address: string
  functions: Map<string, string>
}

export interface ContractWithAssetRecoverer {
  name: string
  address: string
  functions: Map<string, string>
}

export interface PausableContract {
  name: string
  address: string
  functions: Map<string, string>
}

export interface RolesMonitoringContract {
  name: string
  address: string
}

export const CSM_PROXY_CONTRACTS: Proxy[] = [
  {
    name: 'CSModule',
    address: DeploymentAddresses.CS_MODULE_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'CSAccounting',
    address: DeploymentAddresses.CS_ACCOUNTING_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'CSFeeDistributor',
    address: DeploymentAddresses.CS_FEE_DISTRIBUTOR_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'CSFeeOracle',
    address: DeploymentAddresses.CS_FEE_ORACLE_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
]

export const CONTRACTS_WITH_ASSET_RECOVERER: ContractWithAssetRecoverer[] = [
  {
    name: 'CSModule',
    address: DeploymentAddresses.CS_MODULE_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'CSAccounting',
    address: DeploymentAddresses.CS_ACCOUNTING_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'CSFeeDistributor',
    address: DeploymentAddresses.CS_FEE_DISTRIBUTOR_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'CSFeeOracle',
    address: DeploymentAddresses.CS_FEE_ORACLE_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
]

export const PAUSABLE_CONTRACTS: PausableContract[] = [
  {
    name: 'CSModule',
    address: DeploymentAddresses.CS_MODULE_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'CSAccounting',
    address: DeploymentAddresses.CS_ACCOUNTING_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
  {
    name: 'CSFeeOracle',
    address: DeploymentAddresses.CS_FEE_ORACLE_ADDRESS,
    functions: new Map<string, string>([
      ['admin', 'proxy__getAdmin'],
      ['implementation', 'proxy__getImplementation'],
    ]),
  },
]

export const ROLES_MONITORING_CONTRACTS: RolesMonitoringContract[] = [
  {
    name: 'CSModule',
    address: DeploymentAddresses.CS_MODULE_ADDRESS,
  },
  {
    name: 'CSAccounting',
    address: DeploymentAddresses.CS_ACCOUNTING_ADDRESS,
  },
  {
    name: 'CSFeeDistributor',
    address: DeploymentAddresses.CS_FEE_DISTRIBUTOR_ADDRESS,
  },
  {
    name: 'CSFeeOracle',
    address: DeploymentAddresses.CS_FEE_ORACLE_ADDRESS,
  },
  {
    name: 'HashConsensus',
    address: DeploymentAddresses.HASH_CONSENSUS_ADDRESS,
  },
]
