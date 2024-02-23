import { ONE_DAY } from "../../common/constants";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  BURNER_ADDRESS as burnerAddress,
  WITHDRAWALS_VAULT_ADDRESS as wdVaultAddress,
  EL_REWARDS_VAULT_ADDRESS as elVaultAddress,
} from "../../common/constants";

export const LIDO_STETH_ADDRESS = lidoStethAddress;
export const ACCOUNTING_ORACLE_ADDRESS = accountingOracleAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const EL_REWARDS_VAULT_ADDRESS = elVaultAddress;
export const WITHDRAWALS_VAULT_ADDRESS = wdVaultAddress;
export const BURNER_ADDRESS = burnerAddress;

export const CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID = 1;
export const SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID = 2;

export const STAKING_MODULES: {
  moduleId: number | null;
  moduleName: string;
  alertPrefix: string;
}[] = [
  {
    moduleId: CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID,
    moduleName: "Curated",
    alertPrefix: "",
  },
  {
    moduleId: SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID,
    moduleName: "SimpleDVT",
    alertPrefix: "SDVT-",
  },
];

export const LIDO_ETHDESTRIBUTED_EVENT =
  "event ETHDistributed(uint256 indexed reportTimestamp, uint256 preCLBalance, uint256 postCLBalance, uint256 withdrawalsWithdrawn, uint256 executionLayerRewardsWithdrawn, uint256 postBufferedEther)";
export const LIDO_ELREWARDSRECEIVED_EVENT =
  "event ELRewardsReceived(uint256 amount)";
export const LIDO_WITHDRAWALSRECEIVED_EVENT =
  "event WithdrawalsReceived(uint256 amount)";
export const LIDO_VALIDATORS_UPDATED_EVENT =
  "event CLValidatorsUpdated(uint256 indexed reportTimestamp, uint256 preCLValidators, uint256 postCLValidators)";
export const LIDO_SHARES_BURNT_EVENT =
  "event SharesBurnt(address indexed account, uint256 preRebaseTokenAmount, uint256 postRebaseTokenAmount, uint256 sharesAmount)";
export const LIDO_TOKEN_REBASED_EVENT =
  "event TokenRebased(uint256 indexed reportTimestamp, uint256 timeElapsed, uint256 preTotalShares, uint256 preTotalEther, uint256 postTotalShares, uint256 postTotalEther, uint256 sharesMintedAsFees)";

export const ACCOUNTING_ORACLE_EXTRA_DATA_SUBMITTED_EVENT =
  "event ExtraDataSubmitted(uint256 indexed refSlot, uint256 itemsProcessed, uint256 itemsCount)";

export const WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT =
  "event WithdrawalsFinalized(uint256 indexed from, uint256 indexed to, uint256 amountOfETHLocked, uint256 sharesToBurn, uint256 timestamp)";

// Report with higher than info severity if rewards have decreased more than this percentage relative to previous reports value
export const LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_MEDIUM = 1;
export const LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_HIGH = 5;

export const LIDO_REPORT_LOW_APR_THRESHOLD = 0.03;
export const LIDO_REPORT_HIGH_APR_THRESHOLD = 0.2;
export const LIDO_REPORT_LIMIT_REACHED_APR_THRESHOLD = 0.27;

export const OVERFILL_THRESHOLD_PERCENT = 0.1;
export const OVERFILL_ALERT_TRIGGER_EVERY = ONE_DAY;
export const OVERFILL_CHECK_INTERVAL = 10;
