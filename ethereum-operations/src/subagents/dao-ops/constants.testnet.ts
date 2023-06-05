import {
  BURNER_EVENTS_OF_NOTICE as burnerEvents,
  LIDO_EVENTS_OF_NOTICE as daoEvents,
  DEPOSIT_SECURITY_EVENTS_OF_NOTICE as depositSecurityEvents,
  MEV_ALLOWED_LIST_EVENTS_OF_NOTICE as mevAllowedListEvents,
  INSURANCE_FUND_EVENTS_OF_NOTICE as insuranceFundEvents,
  TRP_EVENTS_OF_NOTICE as trpEvents,
} from "./constants";

import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  DEPOSIT_SECURITY_ADDRESS as dsAddress,
  DEPOSIT_EXECUTOR_ADDRESS as deAddress,
  MEV_ALLOWED_LIST_ADDRESS as mevAllowlistAddress,
  INSURANCE_FUND_ADDRESS as insuranceAddress,
  BURNER_ADDRESS as burnerAddress,
  TRP_FACTORY_ADDRESS as trpFactoryAddress,
  ENS_BASE_REGISTRAR_ADDRESS as ensRegistrarAddress,
  LDO_ADDRESS as ldoAddress,
  WSTETH_ADDRESS as wstethAddress,
  DAI_ADDRESS as daiAddress,
  USDT_ADDRESS as usdtAddress,
  USDC_ADDRESS as usdcAddress,
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

export const KNOWN_ERC20 = new Map<string, ERC20>([
  [lidoStethAddress, { decimals: 18, name: "stETH" }],
  [wstethAddress, { decimals: 18, name: "wstETH" }],
  [ldoAddress, { decimals: 18, name: "LDO" }],
  [daiAddress, { decimals: 18, name: "DAI" }],
  [usdtAddress, { decimals: 6, name: "USDT" }],
  [usdcAddress, { decimals: 6, name: "USDC" }],
]);

export const LIDO_EVENTS_OF_NOTICE = daoEvents.map((event) => ({
  ...event,
  address: LIDO_STETH_ADDRESS,
}));

export const BURNER_EVENTS_OF_NOTICE = burnerEvents.map((event) => ({
  ...event,
  address: BURNER_ADDRESS,
}));

export const DEPOSIT_SECURITY_EVENTS_OF_NOTICE = depositSecurityEvents.map(
  (event) => ({
    ...event,
    address: DEPOSIT_SECURITY_ADDRESS,
  })
);

export const MEV_ALLOWED_LIST_EVENTS_OF_NOTICE = mevAllowedListEvents.map(
  (event) => ({
    ...event,
    address: MEV_ALLOWED_LIST_ADDRESS,
  })
);

export const INSURANCE_FUND_EVENTS_OF_NOTICE = insuranceFundEvents.map(
  (event) => ({
    ...event,
    address: INSURANCE_FUND_ADDRESS,
  })
);

export const TRP_EVENTS_OF_NOTICE = trpEvents.map((event) => ({
  ...event,
  address: TRP_FACTORY_ADDRESS,
}));
