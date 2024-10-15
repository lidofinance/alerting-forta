import {
  EASY_TRACK_ADDRESS as easyTrackAddress,
  SET_VETTED_VALIDATORS_LIMITS_ADDRESS as setVettedValidatorsLimitsSDvtAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  SPLIT_WALLET_FACTORY_OBOL_CLUSTER_ADDRESS as splitWalletFactoryObolClusterAddress,
  SPLIT_WALLET_FACTORY_SSV_CLUSTER_ADDRESS as splitWalletFactorySsvClusterAddress,
  ONE_DAY,
  STAKING_ROUTER_ADDRESS as srAddress,
} from "../../common/constants";

export const STUCK_PENALTY_ENDED_TRIGGER_PERIOD = ONE_DAY;

export const CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID = 1;
export const SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID = 2;
export const CSM_NODE_OPERATOR_REGISTRY_MODULE_ID = 3;

export const EASY_TRACK_ADDRESS = easyTrackAddress;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = curatedNorAddress;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;
export const SPLIT_WALLET_FACTORY_OBOL_CLUSTER_ADDRESS =
  splitWalletFactoryObolClusterAddress;
export const SPLIT_WALLET_FACTORY_SSV_CLUSTER_ADDRESS =
  splitWalletFactorySsvClusterAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const BLOCK_INTERVAL = 100;
export const SET_VETTED_VALIDATORS_LIMITS_ADDRESS =
  setVettedValidatorsLimitsSDvtAddress;

// basis points
export const BASIS_POINTS_MULTIPLIER = 100_00;
export const TARGET_SHARE_THRESHOLD_NOTICE = 55;
export const TARGET_SHARE_THRESHOLD_PANIC = 65;

export const MOTION_ENACTED_EVENT =
  "event MotionEnacted(uint256 indexed _motionId)";
export const SIGNING_KEY_REMOVED_EVENT =
  "event SigningKeyRemoved(uint256 indexed operatorId, bytes pubkey)";
export const NODE_OPERATOR_VETTED_KEYS_COUNT_EVENT =
  "event VettedSigningKeysCountChanged(uint256 indexed nodeOperatorId, uint256 approvedValidatorsCount)";
export const NODE_OPERATORS_REGISTRY_EXITED_CHANGED_EVENT =
  "event ExitedSigningKeysCountChanged(uint256 indexed nodeOperatorId, uint256 exitedValidatorsCount)";
export const NODE_OPERATORS_REGISTRY_STUCK_CHANGED_EVENT =
  "event StuckPenaltyStateChanged(uint256 indexed nodeOperatorId, uint256 stuckValidatorsCount, uint256 refundedValidatorsCount, uint256 stuckPenaltyEndTimestamp)";
export const NODE_OPERATOR_REWARD_ADDRESS_SET_EVENT =
  "event NodeOperatorRewardAddressSet(uint256 indexed nodeOperatorId, address rewardAddress)";

export const NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD = 100;
export const NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD = 5;

export const OBOL_LIDO_SPLIT_FACTORY_CLUSTERS = [
  {
    clusterName: "OBOL",
    factoryAddress: SPLIT_WALLET_FACTORY_OBOL_CLUSTER_ADDRESS,
  },
  {
    clusterName: "SSV",
    factoryAddress: SPLIT_WALLET_FACTORY_SSV_CLUSTER_ADDRESS,
  },
];
