export interface ISpenderInfo {
  isContract?: boolean;
  tokens: Map<string, Set<string>>;
  reportedTokenTypesCount: number;
  reportedApproversCount: number;
}
