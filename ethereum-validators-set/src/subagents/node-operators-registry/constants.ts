import {
  EASY_TRACK_ADDRESS as easyTrackAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  ONE_DAY,
  STAKING_ROUTER_ADDRESS as srAddress,
} from "../../common/constants";

export const STUCK_PENALTY_ENDED_TRIGGER_PERIOD = ONE_DAY;

export const CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID = 1;

export const EASY_TRACK_ADDRESS = easyTrackAddress;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = curatedNorAddress;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const BLOCK_INTERVAL = 100;

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

export const NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD = 100;
export const NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD = 5;

export const STAKING_MODULES = [
  {
    moduleId: CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID,
    moduleAddress: CURATED_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "Curated",
    alertPrefix: "",
  },
  {
    moduleId: null,
    moduleAddress: SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "SimpleDVT",
    alertPrefix: "SDVT-",
  },
];
