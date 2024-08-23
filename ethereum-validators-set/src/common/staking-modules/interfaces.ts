export interface NodeOperatorModuleParams {
  moduleId: number;
  moduleAddress: string;
  moduleName: string;
  alertPrefix: string;
}

export interface NodeOperatorFullInfo {
  name: string;
  rewardAddress: string;
}

export interface NodeOperatorSummary {
  targetLimitMode: number;
  targetValidatorsCount: number;
  stuckValidatorsCount: number;
  refundedValidatorsCount: number;
  stuckPenaltyEndTimestamp: number;
  totalExitedValidators: number;
  totalDepositedValidators: number;
  depositableValidatorsCount: number;
}
