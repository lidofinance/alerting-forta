import { ONE_HOUR } from "../../common/constants";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  WITHDRAWALS_QUEUE_ADDRESS as wqAddress,
  BURNER_ADDRESS as burnerAddress,
  WITHDRAWALS_VAULT_ADDRESS as wdVaultAddress,
  EL_REWARDS_VAULT_ADDRESS as elVaultAddress,
} from "../../common/constants.testnet";

export const LIDO_STETH_ADDRESS = lidoStethAddress;
export const ACCOUNTING_ORACLE_ADDRESS = accountingOracleAddress;
export const NODE_OPERATOR_REGISTRY_ADDRESS = norAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const EL_REWARDS_VAULT_ADDRESS = elVaultAddress;
export const WITHDRAWALS_VAULT_ADDRESS = wdVaultAddress;
export const BURNER_ADDRESS = burnerAddress;

export const OVERFILL_ALERT_TRIGGER_EVERY = 2 * ONE_HOUR;
