import { ONE_DAY } from "../../common/constants";

export const LIDO_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
export const ACCOUNTING_ORACLE_ADDRESS =
  "0x852ded011285fe67063a08005c71a85690503cee";
export const STAKING_ROUTER_ADDRESS =
  "0xfddf38947afb03c621c71b06c9c70bce73f12999";
export const WITHDRAWAL_QUEUE_ADDRESS =
  "0x889edc2edab5f40e902b864ad4d7ade8e412f9b1";
export const EL_REWARDS_VAULT_ADDRESS =
  "0x388c818ca8b9251b393131c08a736a67ccb19297";
export const WITHDRAWALS_VAULT_ADDRESS =
  "0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f";
export const BURNER_ADDRESS = "0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f";

export const NODE_OPERATOR_REGISTRY_MODULE_ID = 1;

export const LIDO_ETHDESTRIBUTED_EVENT =
  "event ETHDistributed(uint256 indexed reportTimestamp, uint256 preCLBalance, uint256 postCLBalance, uint256 withdrawalsWithdrawn, uint256 executionLayerRewardsWithdrawn, uint256 postBufferedEther)";
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
