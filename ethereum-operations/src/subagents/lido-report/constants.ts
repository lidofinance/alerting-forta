import { ONE_DAY } from "../../common/constants";

export const LIDO_ADDRESS = "0x1643e812ae58766192cf7d2cf9567df2c37e9b7f";
export const ACCOUNTING_ORACLE_ADDRESS =
  "0x76f358a842defa0e179a8970767cff668fc134d6";
export const STAKING_ROUTER_ADDRESS =
  "0xa3dbd317e53d363176359e10948ba0b1c0a4c820";
export const WITHDRAWAL_QUEUE_ADDRESS =
  "0xcf117961421ca9e546cd7f50bc73abcdb3039533";
export const EL_REWARDS_VAULT_ADDRESS =
  "0x94750381bE1AbA0504C666ee1DB118F68f0780D4";
export const WITHDRAWALS_VAULT_ADDRESS =
  "0xdc62f9e8C34be08501Cdef4EBDE0a280f576D762";
export const BURNER_ADDRESS = "0x20c61C07C2E2FAb04BF5b4E12ce45a459a18f3B1";

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
