import { FindingSeverity } from "forta-agent";

export interface NodeOperatorShortDigest {
  stuck: number;
  refunded: number;
  exited: number;
  isStuckRefunded: boolean;
  stuckPenaltyEndTimestamp: number;
}

export interface EventsOfNotice {
  address: string;
  event: string;
  alertId: string;
  description: (args: any, names: Map<number, string>) => string;
  severity: FindingSeverity;
}

export interface NodeOperatorModuleParams {
  moduleId: number;
  moduleAddress: string;
  alertPrefix: string;
  moduleName: string;
  setVettedValidatorsLimitsAddress?: string;
}

export interface StakingModule {
  moduleId: number;
  moduleAddress: string;
  alertPrefix: string;
  moduleName: string;
}
