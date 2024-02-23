import {
  EASY_TRACK_ADDRESS as etAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
} from "../../common/constants.goerli";
import { SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID } from "../lido-report/constants";

export const EASY_TRACK_ADDRESS = etAddress;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;

export const NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD = 1;
export const NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD = 5;

export const CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID = 1;

export const STAKING_MODULES = [
  {
    moduleId: CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID,
    moduleAddress: CURATED_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "Curated",
    alertPrefix: "",
  },
  {
    moduleId: SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID,
    moduleAddress: "",
    moduleName: "SimpleDVT",
    alertPrefix: "SDVT-",
  },
];
