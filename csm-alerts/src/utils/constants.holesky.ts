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
}

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
