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

export interface NodeOperatorRegistryModule<OperatorDataType> {
  getOperatorById(operatorId: string, block: number): Promise<OperatorDataType>;
  resetOperators(): void;
}
