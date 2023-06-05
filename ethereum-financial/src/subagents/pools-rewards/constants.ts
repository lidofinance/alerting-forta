import { FindingSeverity } from "forta-agent";

export const LDO_TOKEN_ADDRESS = "0x5a98fcbea516cf06857215779fd812ca3bef1b32";

// max delay of receipt of funds for pool rewards manager contract
export const MAX_DELAY_OF_POOL_REWARDS_PERIOD_PROLONGATION = 10 * 60; // 10 mins

// rewardsAddress is needed only if manager contract doesn't have `period_finish` function
export const POOLS_PARAMS: {
  [key: string]: {
    managerAddress: string;
    rewardsAddress: string;
    poolContractAddress: string;
  };
} = {};

const period10days = 10 * 24 * 60 * 60;
const period5days = 5 * 24 * 60 * 60;
const period3days = 3 * 24 * 60 * 60;
const period2days = 2 * 24 * 60 * 60;

// Must be sorted by period ascending
export const POOL_REWARDS_ALERTS_PERIODS_PARAMS = [
  {
    period: period2days,
    minManagerLdoBalance: "10000",
    description: (poolName: string) =>
      `${poolName} rewards period expires in 2 days and LDO balance is under 10,000 LDO`,
    severity: FindingSeverity.High,
    pools: [],
  },
  {
    period: period3days,
    minManagerLdoBalance: "0",
    description: (poolName: string) =>
      `${poolName} rewards period expires in 3 days`,
    severity: FindingSeverity.High,
    pools: [],
  },
  {
    period: period5days,
    minManagerLdoBalance: null,
    description: (poolName: string) =>
      `${poolName} rewards period expires in 5 days`,
    severity: FindingSeverity.Info,
    pools: [],
  },
  {
    period: period10days,
    minManagerLdoBalance: null,
    description: (poolName: string) =>
      `${poolName} rewards period expires in 10 days`,
    severity: FindingSeverity.Info,
    pools: [],
  },
];
