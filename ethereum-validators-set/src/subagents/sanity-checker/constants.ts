import { ORACLE_REPORT_SANITY_CHECKER_ADDRESS as checkerAddress } from "../../common/constants";

export const ORACLE_REPORT_SANITY_CHECKER_ADDRESS = checkerAddress;

export const ORACLE_REPORT_SANITY_CHECKER_LIMITS_EVENTS = {
  "event ExitedValidatorsPerDayLimitSet(uint256 exitedValidatorsPerDayLimit)":
    "exitedValidatorsPerDayLimit",
  "event AppearedValidatorsPerDayLimitSet(uint256 appearedValidatorsPerDayLimit)":
    "appearedValidatorsPerDayLimit",
  "event OneOffCLBalanceDecreaseBPLimitSet(uint256 oneOffCLBalanceDecreaseBPLimit)":
    "oneOffCLBalanceDecreaseBPLimit",
  "event AnnualBalanceIncreaseBPLimitSet(uint256 annualBalanceIncreaseBPLimit)":
    "annualBalanceIncreaseBPLimit",
  "event SimulatedShareRateDeviationBPLimitSet(uint256 simulatedShareRateDeviationBPLimit)":
    "simulatedShareRateDeviationBPLimit",
  "event MaxValidatorExitRequestsPerReportSet(uint256 maxValidatorExitRequestsPerReport)":
    "maxValidatorExitRequestsPerReport",
  "event MaxAccountingExtraDataListItemsCountSet(uint256 maxAccountingExtraDataListItemsCount)":
    "maxAccountingExtraDataListItemsCount",
  "event MaxNodeOperatorsPerExtraDataItemCountSet(uint256 maxNodeOperatorsPerExtraDataItemCount)":
    "maxNodeOperatorsPerExtraDataItemCount",
  "event RequestTimestampMarginSet(uint256 requestTimestampMargin)":
    "requestTimestampMargin",
  "event MaxPositiveTokenRebaseSet(uint256 maxPositiveTokenRebase)":
    "maxPositiveTokenRebase",
  "event InitialSlashingAmountSet(uint256 initialSlashingAmountPWei)":
    "initialSlashingAmountPWei",
  "event InactivityPenaltiesAmountSet(uint256 inactivityPenaltiesAmountPWei)":
    "inactivityPenaltiesAmountPWei",
  "event CLBalanceOraclesErrorUpperBPLimitSet(uint256 clBalanceOraclesErrorUpperBPLimit)":
    "clBalanceOraclesErrorUpperBPLimit",
};
