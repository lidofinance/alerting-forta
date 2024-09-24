// ETHEREUM COMMON ADDRESSES

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
  ACCOUNTING_HASH_CONSENSUS_ADDRESS: string
  HASH_CONSENSUS_ADDRESS: string
  STAKING_ROUTER_ADDRESS: string
  RolesMap: Map<string, string>
}

const DEFAULT_ADMIN_ROLE_HASH: string = ''
const PAUSE_ROLE_HASH: string = ''
const RESUME_ROLE_HASH: string = ''
const STAKING_ROUTER_ROLE_HASH: string = ''
const MODULE_MANAGER_ROLE_HASH: string = ''
const REPORT_EL_REWARDS_STEALING_PENALTY_ROLE_HASH: string = ''
const SETTLE_EL_REWARDS_STEALING_PENALTY_ROLE_HASH: string = ''
const VERIFIER_ROLE_HASH: string = ''
const RECOVERER_ROLE_HASH: string = ''
const ACCOUNTING_MANAGER_ROLE_HASH: string = ''
const MANAGE_BOND_CURVES_ROLE_HASH: string = ''
const SET_BOND_CURVE_ROLE_HASH: string = ''
const RESET_BOND_CURVE_ROLE_HASH: string = ''
const CONTRACT_MANAGER_ROLE_HASH: string = ''
const SUBMIT_DATA_ROLE_HASH: string = ''

export const DeploymentAddresses: DeploymentAddress = {
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
  STAKING_ROUTER_ADDRESS: '',
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
