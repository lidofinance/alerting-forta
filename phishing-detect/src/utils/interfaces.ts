export interface ILastAlerted {
    count: number;
    lastAlerted: number;
  }
  
  export interface ILastAlertedSummary {
    tokens?: ILastAlerted;
    approvals?: Map<string, ILastAlerted>;
  }
  
  export interface ISpenderInfo {
    isContract: boolean;
    tokens: Map<string, Set<string>>;
  }