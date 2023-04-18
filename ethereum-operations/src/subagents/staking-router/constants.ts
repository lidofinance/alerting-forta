import { FindingSeverity } from "forta-agent";

export const STAKING_ROUTER_ADDRESS =
  "0xa3dbd317e53d363176359e10948ba0b1c0a4c820";

export const STAKING_ROUTER_EVENTS_OF_NOTICE = [
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event WithdrawalCredentialsSet(bytes32 withdrawalCredentials, address setBy)",
    alertId: "STAKING-ROUTER-WITHDRAWAL-CREDENTIALS-SET",
    name: "🚨🚨🚨 Staking Router: withdrawal credentials set! 🚨🚨🚨",
    description: (args: any) => `New value: ${args.withdrawalCredentials}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event WithdrawalsCredentialsChangeFailed(uint256 indexed stakingModuleId, bytes lowLevelRevertData)",
    alertId: "STAKING-ROUTER-WITHDRAWAL-CREDENTIALS-SET-FAILED",
    name: "🚨 Staking Router: withdrawal credentials set failed",
    description: (args: any) => `Staking module ID: ${args.stakingModuleId}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event ExitedAndStuckValidatorsCountsUpdateFailed(uint256 indexed stakingModuleId, bytes lowLevelRevertData)",
    alertId: "STAKING-ROUTER-EXITED-AND-STUCK-UPDATE-FAILED",
    name: "🚨 Staking Router: exited and stuck validators counts update was failed",
    description: (args: any) => `Staking module ID: ${args.stakingModuleId}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event RewardsMintedReportFailed(uint256 indexed stakingModuleId, bytes lowLevelRevertData)",
    alertId: "STAKING-ROUTER-REWARDS-MINTED-REPORT-FAILED",
    name: "🚨 Staking Router: rewards minting was failed",
    description: (args: any) => `Staking module ID: ${args.stakingModuleId}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event StakingModuleExitedValidatorsIncompleteReporting(uint256 indexed stakingModuleId, uint256 unreportedExitedValidatorsCount)",
    alertId: "STAKING-ROUTER-REWARDS-MINTED-REPORT-FAILED",
    name: "🚨 Staking Router: rewards minting was failed",
    description: (args: any) => `Staking module ID: ${args.stakingModuleId}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event StakingModuleStatusSet(uint256 indexed stakingModuleId, StakingModuleStatus status, address setBy)",
    alertId: "STAKING-ROUTER-MODULE-STATUS-SET",
    name: "🚨 Staking Router: staking module status set",
    description: (args: any) =>
      `ID: ${args.stakingModuleId}\nStatus: ${args.status}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event StakingModuleAdded(uint256 indexed stakingModuleId, address stakingModule, string name, address createdBy)",
    alertId: "STAKING-ROUTER-MODULE-ADDED",
    name: "⚠️ Staking Router: new staking module added",
    description: (args: any) =>
      `ID: ${args.stakingModuleId}\nAddress: ${args.stakingModule}\nStaking module name: ${args.name}`,
    severity: FindingSeverity.High,
  },
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event StakingModuleTargetShareSet(uint256 indexed stakingModuleId, uint256 targetShare, address setBy)",
    alertId: "STAKING-ROUTER-MODULE-TARGET-SHARE-SET",
    name: "⚠️ Staking Router: staking module target share set",
    description: (args: any) =>
      `ID: ${args.stakingModuleId}\nTarget share: ${args.targetShare}`,
    severity: FindingSeverity.High,
  },
  {
    address: STAKING_ROUTER_ADDRESS,
    event:
      "event StakingModuleFeesSet(uint256 indexed stakingModuleId, uint256 stakingModuleFee, uint256 treasuryFee, address setBy)",
    alertId: "STAKING-ROUTER-MODULE-FEES-SET",
    name: "⚠️ Staking Router: staking module fees set",
    description: (args: any) =>
      `ID: ${args.stakingModuleId}\nStaking module fee: ${args.stakingModuleFee}\nTreasury fee: ${args.treasuryFee}`,
    severity: FindingSeverity.High,
  },
];
