import { MEV_ALLOWED_LIST_EVENTS_OF_NOTICE as mevAllowedListEvents } from "./constants";

import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  WITHDRAWALS_QUEUE_ADDRESS as wqAddress,
  DEPOSIT_SECURITY_ADDRESS as dsAddress,
  DEPOSIT_EXECUTOR_ADDRESS as deAddress,
  MEV_ALLOWED_LIST_ADDRESS as mevAllowlistAddress,
  INSURANCE_FUND_ADDRESS as insuranceAddress,
  BURNER_ADDRESS as burnerAddress,
  TRP_FACTORY_ADDRESS as trpFactoryAddress,
  ENS_BASE_REGISTRAR_ADDRESS as ensRegistrarAddress,
} from "../../common/constants.holesky";

export interface ERC20 {
  decimals: number;
  name: string;
}

export const LIDO_STETH_ADDRESS = lidoStethAddress;
export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const DEPOSIT_SECURITY_ADDRESS = dsAddress;
export const DEPOSIT_EXECUTOR_ADDRESS = deAddress;
export const MEV_ALLOWED_LIST_ADDRESS = mevAllowlistAddress;
export const INSURANCE_FUND_ADDRESS = insuranceAddress;
export const BURNER_ADDRESS = burnerAddress;
export const TRP_FACTORY_ADDRESS = trpFactoryAddress;
export const ENS_BASE_REGISTRAR_ADDRESS = ensRegistrarAddress;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = curatedNorAddress;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID = 1;
export const SIMPLEDVT_NODE_OPERATOR_REGISTRY_MODULE_ID = 2;
export const CSM_NODE_OPERATOR_REGISTRY_MODULE_ID = 4;

export const MEV_ALLOWED_LIST_EVENTS_OF_NOTICE = mevAllowedListEvents.map(
  (event) => ({
    ...event,
    address: MEV_ALLOWED_LIST_ADDRESS,
  }),
);

export const STAKING_MODULES: {
  moduleId: number;
  moduleAddress: string;
  moduleName: string;
  alertPrefix: string;
}[] = [
  {
    moduleId: CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID,
    moduleAddress: CURATED_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "Curated",
    alertPrefix: "",
  },
  {
    moduleId: SIMPLEDVT_NODE_OPERATOR_REGISTRY_MODULE_ID,
    moduleAddress: SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: "SimpleDVT",
    alertPrefix: "SDVT-",
  },
];
