import {FindingSeverity} from "forta-agent";

// trigger each 5 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 5;

export const LIDO_ORACLE_ADDRESS = "0x442af784a788a5bd6f42a01ebe9f287a871243fb";

export const LIDO_ORACLE_COMPLETED_EVENT =
    "event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)";

export const LIDO_ORACLE_BEACON_REPORTED_EVENT =
    "event BeaconReported(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators, address caller)";

// Report with higher than info severity if rewards have decreased more than this percentage relative to previous reports value
export const LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD_MEDIUM = 1;
export const LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD_HIGH = 5;

export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO = Math.floor(
    (60 * 60 * 24 * 7) / 12
); // 1 week
export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM = Math.floor(
    (60 * 60 * 24 * 14) / 12
); // 2 weeks

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_DELAY = 24 * 60 * 60 + 15 * 60; // 24h 15m

export const MIN_ORACLE_BALANCE_INFO = 0.3; // 0.3 ETH

export const MIN_ORACLE_BALANCE_HIGH = 0.15; // 0.15 ETH

export const LIDO_ORACLE_EVENTS_OF_NOTICE = [
    {
        address: LIDO_ORACLE_ADDRESS,
        event: "event AllowedBeaconBalanceAnnualRelativeIncreaseSet(uint256 value)",
        alertId: "LIDO-ORACLE-BALANCE-RELATIVE-INCREASE-SET",
        name: "⚠️ Lido Oracle: Allowed Beacon Balance Annual Relative Increase Change",
        description: (args: any) =>
            `Allowed beacon balance annual relative increase was set to ${args.value}`,
        severity: FindingSeverity.High,
    },
    {
        address: LIDO_ORACLE_ADDRESS,
        event: "event AllowedBeaconBalanceRelativeDecreaseSet(uint256 value)",
        alertId: "LIDO-ORACLE-BALANCE-RELATIVE-DECREASE-SET",
        name: "⚠️ Lido Oracle: Allowed Beacon Balance Annual Relative Decrease Change",
        description: (args: any) =>
            `Allowed beacon balance annual relative decrease was set to ${args.value}`,
        severity: FindingSeverity.High,
    },
    {
        address: LIDO_ORACLE_ADDRESS,
        event: "event BeaconReportReceiverSet(address callback)",
        alertId: "LIDO-ORACLE-BEACON-REPORT-RECEIVER-SET",
        name: "⚠️ Lido Oracle: Beacon Report Receiver Change",
        description: (args: any) =>
            `New beacon report receiver was set to ${args.callback}`,
        severity: FindingSeverity.High,
    },
    {
        address: LIDO_ORACLE_ADDRESS,
        event: "event MemberAdded(address member)",
        alertId: "LIDO-ORACLE-MEMBER-ADDED",
        name: "ℹ️ Lido Oracle: Member Added",
        description: (args: any) => `New oracle member added - ${args.member}`,
        severity: FindingSeverity.High,
    },
    {
        address: LIDO_ORACLE_ADDRESS,
        event: "event MemberRemoved(address member)",
        alertId: "LIDO-ORACLE-MEMBER-REMOVED",
        name: "⚠️ Lido Oracle: Member Removed",
        description: (args: any) => `New oracle member removed - ${args.member}`,
        severity: FindingSeverity.High,
    },
    {
        address: LIDO_ORACLE_ADDRESS,
        event: "event QuorumChanged(uint256 quorum)",
        alertId: "LIDO-ORACLE-QUORUM-CHANGED",
        name: "🚨 Lido Oracle: Quorum Changed",
        description: (args: any) =>
            `Quorum size was set to ${args.quorum}`,
        severity: FindingSeverity.High,
    },
];
