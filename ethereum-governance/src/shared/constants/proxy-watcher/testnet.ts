import { ProxyInfo } from '../../../shared/types'
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  LIDO_LOCATOR_ADDRESS as lidoLocatorAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  ARAGON_VOTING_ADDRESS as votingAddress,
  WITHDRAWALS_QUEUE_ADDRESS as wqAddress,
  EXITBUS_ORACLE_ADDRESS as ebOracleAddress,
  WITHDRAWALS_VAULT_ADDRESS as wdVaultAddress,
  LEGACY_ORACLE_ADDRESS as legacyOracleAddress,
  ARAGON_AGENT_ADDRESS as agentAddress,
  ARAGON_ACL_ADDRESS as aclAddress,
  VOTING_REPO_ADDRESS as votingRepoAddress,
  APP_REPO_ADDRESS as appRepoAddress,
  ORACLE_REPO_ADDRESS as oracleRepoAddress,
  CURATED_NO_REPO_ADDRESS as curatedNoRepoAddress,
  ARAGON_TOKEN_MANAGER_ADDRESS as tmAddress,
  ARAGON_FINANCE_ADDRESS as financeAddress,
  CS_MODULE as csmAddress,
  CS_ACCOUNTING as csmAccountingAddress,
  CS_FEE_DISTRIBUTOR as csmFeeDistributorAddress,
  CS_FEE_ORACLE as csmFeeOracleAddress,
} from 'constants/common'

export const implementationFuncShortABI =
  '[{"constant":true,"inputs":[],"name":"implementation","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]'

export const ossifiableProxyImplABI =
  '[{"inputs":[],"name":"proxy__getImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]'

export const LIDO_PROXY_CONTRACTS_DATA = new Map<string, ProxyInfo>([
  [
    lidoStethAddress,
    {
      name: 'Lido DAO and stETH',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    norAddress,
    {
      name: 'Node Operators Registry',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    legacyOracleAddress,
    {
      name: 'Legacy Oracle',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    votingAddress,
    {
      name: 'Aragon Voting',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    tmAddress,
    {
      name: 'Aragon Token Manager',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    financeAddress,
    {
      name: 'Aragon Finance',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    agentAddress,
    {
      name: 'Lido Treasury',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    aclAddress,
    {
      name: 'Aragon ACL',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    oracleRepoAddress,
    {
      name: 'Lido Oracle Repo',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    appRepoAddress,
    {
      name: 'Lido App Repo',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    curatedNoRepoAddress,
    {
      name: 'Curated Node Operators Registry Repo',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    votingRepoAddress,
    {
      name: 'Voting Repo',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    lidoLocatorAddress,
    {
      name: 'Lido Locator',
      shortABI: ossifiableProxyImplABI,
    },
  ],
  [
    srAddress,
    {
      name: 'Staking Router',
      shortABI: ossifiableProxyImplABI,
    },
  ],
  [
    wqAddress,
    {
      name: 'Withdrawal Queue',
      shortABI: ossifiableProxyImplABI,
    },
  ],
  [
    wdVaultAddress,
    {
      name: 'Withdrawal Vault',
      shortABI: implementationFuncShortABI,
    },
  ],
  [
    accountingOracleAddress,
    {
      name: 'Accounting Oracle',
      shortABI: ossifiableProxyImplABI,
    },
  ],
  [
    ebOracleAddress,
    {
      name: 'Validator Exit Bus Oracle',
      shortABI: ossifiableProxyImplABI,
    },
  ],
  [
    csmAddress,
    {
      name: 'Community Staking Module',
      shortABI: ossifiableProxyImplABI,
    },
  ],
  [
    csmAccountingAddress,
    {
      name: 'CSM Accounting',
      shortABI: ossifiableProxyImplABI,
    },
  ],
  [
    csmFeeDistributorAddress,
    {
      name: 'CSM FeeDistributor',
      shortABI: ossifiableProxyImplABI,
    },
  ],
  [
    csmFeeOracleAddress,
    {
      name: 'CSM FeeOracle',
      shortABI: ossifiableProxyImplABI,
    },
  ],
])
