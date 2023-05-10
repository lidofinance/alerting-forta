import {
  BURNER_EVENTS_OF_NOTICE as burnerEvents,
  LIDO_DAO_EVENTS_OF_NOTICE as daoEvents,
  DEPOSIT_SECURITY_EVENTS_OF_NOTICE as depositSecurityEvents,
  MEV_ALLOWED_LIST_EVENTS_OF_NOTICE as mevAllowedListEvents,
  INSURANCE_FUND_EVENTS_OF_NOTICE as insuranceFundEvents,
  TRP_EVENTS_OF_NOTICE as trpEvents,
} from "./constants";

export interface ERC20 {
  decimals: number;
  name: string;
}

export const LIDO_DAO_ADDRESS = "0x1643e812ae58766192cf7d2cf9567df2c37e9b7f";
export const LIDO_DEPOSIT_SECURITY_ADDRESS =
  "0xe57025e250275ca56f92d76660decfc490c7e79a";
export const LIDO_DEPOSIT_EXECUTOR_ADDRESS =
  "0x745ad85f7c20ea6f3c85b830208394e0d70a31ea";
export const MEV_ALLOWED_LIST_ADDRESS =
  "0xeabe95ac5f3d64ae16acbb668ed0efcd81b721bc";
export const LIDO_INSURANCE_FUND_ADDRESS =
  "0x2fae4d2d86efb17249f24c9fb70855d4c58585a5";
export const TRP_FACTORY_ADDRESS = "0x8d20fd1ac547e035bf01089cfb92459054f82ff7";
export const ENS_BASE_REGISTRAR_ADDRESS =
  "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x9d4af1ee19dad8857db3a45b0374c81c8a1c6320";
export const LIDO_BURNER_ADDRESS = "0x20c61c07c2e2fab04bf5b4e12ce45a459a18f3b1";

export const KNOWN_ERC20 = new Map<string, ERC20>([
  [
    "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F",
    { decimals: 18, name: "stETH" },
  ],
  [
    "0x6320cd32aa674d2898a68ec82e869385fc5f7e2f",
    { decimals: 18, name: "wstETH" },
  ],
  ["0x56340274fB5a72af1A3C6609061c451De7961Bd4", { decimals: 18, name: "LDO" }],
  ["0x6B175474E89094C44Da98b954EedeAC495271d0F", { decimals: 18, name: "DAI" }],
  ["0xdAC17F958D2ee523a2206206994597C13D831ec7", { decimals: 6, name: "USDT" }],
  ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", { decimals: 6, name: "USDC" }],
]);

export const LIDO_DAO_EVENTS_OF_NOTICE = daoEvents.map((event) => ({
  ...event,
  address: LIDO_DAO_ADDRESS,
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
