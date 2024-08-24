import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import { etherscanAddress } from "../../common/utils";
import { ETH_DECIMALS } from "../../common/constants";
import { NodeOperatorFullInfo } from "../../common/interfaces";

interface StakingModule {
  moduleId: number;
  moduleAddress: string;
  alertPrefix: string;
  moduleName: string;
}

export const getEventsOfNoticeForStakingModule = (
  stakingModule: StakingModule,
) => {
  const { moduleAddress, moduleName, alertPrefix } = stakingModule;
  return [
    {
      address: moduleAddress,
      event:
        "event TargetValidatorsCountChanged(uint256 indexed nodeOperatorId, uint256 targetValidatorsCount)",
      alertId: `${alertPrefix}NODE-OPERATOR-TARGET-VALIDATORS-COUNT-CHANGED`,
      name: `⚠️ ${moduleName} NO Registry: Node operator target validators count changed`,
      description: (args: any) =>
        `${moduleName} module ` +
        `Node operator ${args.nodeOperatorId} ` +
        `target validators count changed to ${args.targetValidatorsCount}`,
      severity: FindingSeverity.Medium,
    },
    {
      address: moduleAddress,
      event:
        "event NodeOperatorAdded(uint256 nodeOperatorId, string name, address rewardAddress, uint64 stakingLimit)",
      alertId: `${alertPrefix}NODE-OPERATOR-ADDED`,
      name: `ℹ️ ${moduleName} NO Registry: Node operator added`,
      description: (args: any) =>
        `${moduleName} module ` +
        `Node operator ${args.nodeOperatorId} added\n` +
        `Name: ${args.name}\n` +
        `Reward address: ${etherscanAddress(args.rewardAddress)}\n` +
        `StakingLimit: ${args.stakingLimit}`,
      severity: FindingSeverity.Info,
    },
    {
      address: moduleAddress,
      event:
        "event NodeOperatorActiveSet(uint256 indexed nodeOperatorId, bool active)",
      alertId: `${alertPrefix}NODE-OPERATOR-ACTIVE-SET`,
      name: `ℹ️ ${moduleName} NO Registry: Node operator active set`,
      description: (args: any, names: Map<number, NodeOperatorFullInfo>) =>
        `${moduleName} module ` +
        `Node operator [${args.nodeOperatorId} ${names.get(
          Number(args.nodeOperatorId),
        )?.name}] active status set to ${args.active}`,
      severity: FindingSeverity.Info,
    },
    {
      address: moduleAddress,
      event:
        "event NodeOperatorNameSet(uint256 indexed nodeOperatorId, string name)",
      alertId: `${alertPrefix}NODE-OPERATOR-NAME-SET`,
      name: `ℹ️ ${moduleName} NO Registry: Node operator name set`,
      description: (args: any, names: Map<number, NodeOperatorFullInfo>) =>
        `${moduleName} module ` +
        `Node operator [${args.nodeOperatorId} ${names.get(
          Number(args.nodeOperatorId),
        )?.name}] name set to ${args.name}`,
      severity: FindingSeverity.Info,
    },
    {
      address: moduleAddress,
      event:
        "event NodeOperatorRewardAddressSet(uint256 indexed nodeOperatorId, address rewardAddress)",
      alertId: `${alertPrefix}NODE-OPERATOR-REWARD-ADDRESS-SET`,
      name: `ℹ️ ${moduleName} NO Registry: Node operator reward address set`,
      description: (args: any, names: Map<number, NodeOperatorFullInfo>) =>
        `${moduleName} module ` +
        `Node operator [${args.nodeOperatorId} ${names.get(
          Number(args.nodeOperatorId),
        )?.name}] reward address set to ${etherscanAddress(
          args.rewardAddress,
        )}`,
      severity: FindingSeverity.Info,
    },
    {
      address: moduleAddress,
      event:
        "event NodeOperatorTotalKeysTrimmed(uint256 indexed nodeOperatorId, uint64 totalKeysTrimmed)",
      alertId: `${alertPrefix}NODE-OPERATOR-KEYS-TRIMMED`,
      name: `⚠️ ${moduleName} NO Registry: Node operator total keys trimmed`,
      description: (args: any, names: Map<number, NodeOperatorFullInfo>) =>
        `${moduleName} module ` +
        `Node operator [${args.nodeOperatorId}: ${names.get(
          Number(args.nodeOperatorId),
        )?.name}] total keys trimmed ${args.totalKeysTrimmed}`,
      severity: FindingSeverity.Info,
    },
    {
      address: moduleAddress,
      event: "event StakingModuleTypeSet(bytes32 moduleType)",
      alertId: `${alertPrefix}STAKING-MODULE-TYPE-SET`,
      name: `⚠️ ${moduleName} NO Registry: Staking module type set`,
      description: (args: any) =>
        `Staking module type set to ${args.moduleType}`,
      severity: FindingSeverity.Info,
    },
    {
      address: moduleAddress,
      event: "event LocatorContractSet(address locatorAddress)",
      alertId: `${alertPrefix}NOR-LOCATOR-CONTRACT-SET`,
      name: `⚠️ ${moduleName} NO Registry: Locator contract set`,
      description: (args: any) =>
        `Locator contract set to ${etherscanAddress(args.locatorAddress)}`,
      severity: FindingSeverity.High,
    },
    {
      address: moduleAddress,
      event: "event StuckPenaltyDelayChanged(uint256 stuckPenaltyDelay)",
      alertId: `${alertPrefix}NOR-STUCK-PENALTY-DELAY-CHANGED`,
      name: `⚠️ ${moduleName} NO Registry: Stuck penalty delay changed`,
      description: (args: any) =>
        `Stuck penalty delay changed to ${args.stuckPenaltyDelay}`,
      severity: FindingSeverity.High,
    },
    {
      address: moduleAddress,
      event:
        "event NodeOperatorPenalized(address indexed recipientAddress, uint256 sharesPenalizedAmount)",
      alertId: `${alertPrefix}NOR-NODE-OPERATOR-PENALIZED`,
      name: `⚠️ ${moduleName} NO Registry: Node operator penalized`,
      description: (args: any) =>
        `${moduleName} module ` +
        `Node operator ${etherscanAddress(
          args.recipientAddress,
        )} penalized with ${new BigNumber(args.sharesPenalizedAmount.toString())
          .div(ETH_DECIMALS)
          .toFixed(2)} × 1e18 shares`,
      severity: FindingSeverity.High,
    },
  ];
};
