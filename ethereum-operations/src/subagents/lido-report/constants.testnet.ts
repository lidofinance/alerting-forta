import { ONE_HOUR } from "../../common/constants";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  LIDO_BURNER_ADDRESS as burnerAddress,
} from "../../common/constants.testnet";

export const LIDO_STETH_ADDRESS = lidoStethAddress;
export const ACCOUNTING_ORACLE_ADDRESS = accountingOracleAddress;
export const NODE_OPERATOR_REGISTRY_ADDRESS = norAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const EL_REWARDS_VAULT_ADDRESS =
  "0x94750381bE1AbA0504C666ee1DB118F68f0780D4";
export const WITHDRAWALS_VAULT_ADDRESS =
  "0xdc62f9e8C34be08501Cdef4EBDE0a280f576D762";
export const BURNER_ADDRESS = burnerAddress;

export const OVERFILL_ALERT_TRIGGER_EVERY = 2 * ONE_HOUR;
