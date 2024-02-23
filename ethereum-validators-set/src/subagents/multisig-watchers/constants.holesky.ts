import {
  ARAGON_ACL_ADDRESS as aclContractAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
} from "../../common/constants.holesky";

export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_MODULE_ID = 2;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = curatedNorAddress;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const ARAGON_ACL_ADDRESS = aclContractAddress;

export const STAKING_MODULES = [
  {
    moduleId: SIMPLEDVT_NODE_OPERATORS_REGISTRY_MODULE_ID,
    moduleAddress: SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "SimpleDVT",
    alertPrefix: "SDVT-",
  },
];

export const MODULE_MANAGERS = [];
