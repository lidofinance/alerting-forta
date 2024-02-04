import {
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  SPLIT_MAIN_0XSPLIT_ADDRESS as splitMainAddress,
  SPLIT_WALLET_FACTORY_OBOL_CLUSTER_ADDRESS as splitWalletFactoryObolClusterAddress,
  SPLIT_WALLET_FACTORY_SSV_CLUSTER_ADDRESS as splitWalletFactorySsvClusterAddress,
} from "../../common/constants";

export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_MODULE_ID = null;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const SPLIT_MAIN_0XSPLIT_ADDRESS = splitMainAddress;
export const SPLIT_WALLET_FACTORY_OBOL_CLUSTER_ADDRESS =
  splitWalletFactoryObolClusterAddress;
export const SPLIT_WALLET_FACTORY_SSV_CLUSTER_ADDRESS =
  splitWalletFactorySsvClusterAddress;

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
