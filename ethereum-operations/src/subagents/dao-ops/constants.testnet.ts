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
  LIDO_DEPOSIT_SECURITY_ADDRESS as dsAddress,
  LIDO_DEPOSIT_EXECUTOR_ADDRESS as deAddress,
  MEV_ALLOWED_LIST_ADDRESS as mevAllowlistAddress,
  LIDO_INSURANCE_FUND_ADDRESS as insuranceAddress,
  LIDO_BURNER_ADDRESS as burnerAddress,
  TRP_FACTORY_ADDRESS as trpFactoryAddress,
  ENS_BASE_REGISTRAR_ADDRESS as ensRegistrarAddress,
} from "../../common/constants.testnet";

export interface ERC20 {
  decimals: number;
  name: string;
}

export const LIDO_STETH_ADDRESS = lidoStethAddress;
export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const LIDO_DEPOSIT_SECURITY_ADDRESS = dsAddress;
export const LIDO_DEPOSIT_EXECUTOR_ADDRESS = deAddress;
export const MEV_ALLOWED_LIST_ADDRESS = mevAllowlistAddress;
export const LIDO_INSURANCE_FUND_ADDRESS = insuranceAddress;
export const LIDO_BURNER_ADDRESS = burnerAddress;
export const TRP_FACTORY_ADDRESS = trpFactoryAddress;
export const ENS_BASE_REGISTRAR_ADDRESS = ensRegistrarAddress;
export const NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;

export const KNOWN_ERC20 = new Map<string, ERC20>([
  [lidoStethAddress, { decimals: 18, name: "stETH" }],
  [
    "0x6320cd32aa674d2898a68ec82e869385fc5f7e2f",
    { decimals: 18, name: "wstETH" },
  ],
  ["0x56340274fB5a72af1A3C6609061c451De7961Bd4", { decimals: 18, name: "LDO" }],
  ["0x6B175474E89094C44Da98b954EedeAC495271d0F", { decimals: 18, name: "DAI" }],
  ["0xdAC17F958D2ee523a2206206994597C13D831ec7", { decimals: 6, name: "USDT" }],
  ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", { decimals: 6, name: "USDC" }],
]);

export const LIDO_EVENTS_OF_NOTICE = daoEvents.map((event) => ({
  ...event,
  address: LIDO_STETH_ADDRESS,
}));

export const BURNER_EVENTS_OF_NOTICE = burnerEvents.map((event) => ({
  ...event,
  address: LIDO_BURNER_ADDRESS,
}));

export const DEPOSIT_SECURITY_EVENTS_OF_NOTICE = depositSecurityEvents.map(
  (event) => ({
    ...event,
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
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
    address: LIDO_INSURANCE_FUND_ADDRESS,
  })
);

export const TRP_EVENTS_OF_NOTICE = trpEvents.map((event) => ({
  ...event,
  address: TRP_FACTORY_ADDRESS,
}));
