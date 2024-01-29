import {
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  SPLIT_MAIN_0XSPLIT_ADDRESS as splitMainAddress,
  OBOL_LIDO_SPLIT_FACTORY_ADDRESS as splitWalletFactoryAddress,
} from "../../common/constants";

export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_MODULE_ID = null;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const SPLIT_MAIN_0XSPLIT_ADDRESS = splitMainAddress;
export const OBOL_LIDO_SPLIT_FACTORY_ADDRESS = splitWalletFactoryAddress;

export const NODE_OPERATOR_REWARD_ADDRESS_SET_EVENT =
  "event NodeOperatorRewardAddressSet(uint256 indexed nodeOperatorId, address rewardAddress)";

export const STAKING_MODULES = [
  {
    moduleId: SIMPLEDVT_NODE_OPERATORS_REGISTRY_MODULE_ID,
    moduleAddress: SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "SimpleDVT",
    alertPrefix: "SDVT-",
  },
];
