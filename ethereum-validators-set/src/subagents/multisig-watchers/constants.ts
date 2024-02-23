import { FindingSeverity } from "forta-agent";
import {
  ARAGON_ACL_ADDRESS as aclContractAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  MODULE_MANAGER_MULTISIG_ADDRESS as moduleManagerMultisigAddress,
} from "../../common/constants";
import { SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID } from "../lido-report/constants";

export const ARAGON_ACL_ADDRESS = aclContractAddress;
export const CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID = 1;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = curatedNorAddress;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const MODULE_MANAGER_MULTISIG_ADDRESS = moduleManagerMultisigAddress;

export const STAKING_MODULES = [
  {
    moduleId: SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID,
    moduleAddress: SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "SimpleDVT",
    alertPrefix: "SDVT-",
  },
];

export const MODULE_MANAGERS = [
  {
    moduleManagerAddress: MODULE_MANAGER_MULTISIG_ADDRESS,
    moduleManagerName: "Lido Module Manager",
    alertPrefix: "LMM-",
  },
];

export const BLOCKCHAIN_INFO = {
  addressUrlPrefix: "https://etherscan.io/address/",
  txUrlPrefix: "https://etherscan.io/tx/",
  safeTxUrlPrefix: "https://app.safe.global/transactions/tx?safe=eth:",
  safeUrlPrefix: "https://app.safe.global/home?safe=eth:",
};
