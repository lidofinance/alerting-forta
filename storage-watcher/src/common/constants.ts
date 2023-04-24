import BigNumber from "bignumber.js";

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export const NULL_STORAGE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const RUN_TIER = process.env.FORTA_AGENT_RUN_TEAR;

// INTERFACES

export interface StorageSlot {
  name: string;
  address?: string;
  isArray?: boolean;
}

export interface Contract {
  name: string;
  address: string;
}

export interface ContractStorageMap {
  contract: Contract;
  slots: StorageSlot[];
}
