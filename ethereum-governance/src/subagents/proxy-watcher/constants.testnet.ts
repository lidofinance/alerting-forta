import { IProxyContractData } from "src/common/constants";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  LIDO_LOCATOR_ADDRESS as lidoLocatorAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  ARAGON_VOTING_ADDRESS as votingAddress,
  WITHDRAWALS_QUEUE_ADDRESS as wqAddress,
  EXITBUS_ORACLE_ADDRESS as ebOracleAddress,
  WITHDRAWALS_VAULT_ADDRESS as wdVaultAddress,
  ARAGON_ACL_ADDRESS as aclAddress,
  LEGACY_ORACLE_ADDRESS as legacyOracleAddress,
  ARAGON_AGENT_ADDRESS as agentAddress,
  VOTING_REPO_ADDRESS as votingRepoAddress,
  APP_REPO_ADDRESS as appRepoAddress,
  ORACLE_REPO_ADDRESS as oracleRepoAddress,
  NO_REPO_ADDRESS as noRepoAddress,
  ARAGON_TOKEN_MANAGER_ADDRESS as tmAddress,
  ARAGON_FINANCE_ADDRESS as financeAddress,
} from "../../common/constants.testnet";
import {
  implementationFuncShortABI,
  ossifiableProxyImplABI,
} from "./constants";

export const LIDO_PROXY_CONTRACTS_DATA: Map<string, IProxyContractData> =
  new Map<string, IProxyContractData>([
    [
      lidoStethAddress,
      {
        name: "Lido DAO and stETH",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      norAddress,
      {
        name: "Node Operators Registry",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      legacyOracleAddress,
      {
        name: "Legacy Oracle",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      votingAddress,
      {
        name: "Aragon Voting",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      tmAddress,
      {
        name: "Aragon Token Manager",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      financeAddress,
      {
        name: "Aragon Finance",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      agentAddress,
      {
        name: "Lido Treasury",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      aclAddress,
      {
        name: "Aragon ACL",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      oracleRepoAddress,
      {
        name: "Lido Oracle Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      appRepoAddress,
      {
        name: "Lido App Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      noRepoAddress,
      {
        name: "Node Operators Registry Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      votingRepoAddress,
      {
        name: "Voting Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      lidoLocatorAddress,
      {
        name: "Lido Locator",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      srAddress,
      {
        name: "Staking Router",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      wqAddress,
      {
        name: "Withdrawal Queue",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      wdVaultAddress,
      {
        name: "Withdrawal Vault",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      accountingOracleAddress,
      {
        name: "Accounting Oracle",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      ebOracleAddress,
      {
        name: "Validator Exit Bus Oracle",
        shortABI: ossifiableProxyImplABI,
      },
    ],
  ]);
