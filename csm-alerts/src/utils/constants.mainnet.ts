import BigNumber from 'bignumber.js'

// HOLESKY COMMON ADDRESSES
export const ETH_DECIMALS = new BigNumber(10).pow(18)

export type Address = {
  CS_MODULE_ADDRESS: string
  CS_ACCOUNTING_ADDRESS: string
  CS_FEE_DISTRIBUTOR_ADDRESS: string
  CS_FEE_ORACLE_ADDRESS: string
  CS_VERIFIER_ADDRESS: string
  CS_EARLY_ADOPTION_ADDRESS: string
  CSM_GATE_SEAL_ADDRESS: string
  LIDO_STETH_ADDRESS: string
  BURNER_ADDRESS: string
  ACCOUNTING_HASH_CONSENSUS_ADDRESS: string
  HASH_CONSENSUS_ADDRESS: string
}

export const DeploymentAddresses: Address = {
  CS_MODULE_ADDRESS: '',
  CS_ACCOUNTING_ADDRESS: '',
  CS_FEE_DISTRIBUTOR_ADDRESS: '',
  CS_FEE_ORACLE_ADDRESS: '',
  CS_VERIFIER_ADDRESS: '',
  CS_EARLY_ADOPTION_ADDRESS: '',
  CSM_GATE_SEAL_ADDRESS: '',
  LIDO_STETH_ADDRESS: '',
  BURNER_ADDRESS: '',
  ACCOUNTING_HASH_CONSENSUS_ADDRESS: '',
  HASH_CONSENSUS_ADDRESS: '',
}
export interface Proxy {
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
