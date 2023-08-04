import { ORACLE_REPORT_SANITY_CHECKER_ADDRESS as checkerAddress } from "../../common/constants";

export const ORACLE_REPORT_SANITY_CHECKER_ADDRESS = checkerAddress;

export const ORACLE_REPORT_SANITY_CHECKER_LIMITS = [
  "churnValidatorsPerDayLimit",
  "oneOffCLBalanceDecreaseBPLimit",
  "annualBalanceIncreaseBPLimit",
  "simulatedShareRateDeviationBPLimit",
  "maxValidatorExitRequestsPerReport",
  "maxAccountingExtraDataListItemsCount",
  "maxNodeOperatorsPerExtraDataItemCount",
  "requestTimestampMargin",
  "maxPositiveTokenRebase",
];
