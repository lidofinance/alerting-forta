import { MEV_ALLOWED_LIST_EVENTS_OF_NOTICE as mevAllowedListEvents } from "./constants";

import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  WITHDRAWALS_QUEUE_ADDRESS as wqAddress,
  DEPOSIT_SECURITY_ADDRESS as dsAddress,
  DEPOSIT_EXECUTOR_ADDRESS as deAddress,
  MEV_ALLOWED_LIST_ADDRESS as mevAllowlistAddress,
  INSURANCE_FUND_ADDRESS as insuranceAddress,
  BURNER_ADDRESS as burnerAddress,
  TRP_FACTORY_ADDRESS as trpFactoryAddress,
  ENS_BASE_REGISTRAR_ADDRESS as ensRegistrarAddress,
} from "../../common/constants.testnet";

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
export const NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;

export const MEV_ALLOWED_LIST_EVENTS_OF_NOTICE = mevAllowedListEvents.map(
  (event) => ({
    ...event,
    address: MEV_ALLOWED_LIST_ADDRESS,
  }),
);
