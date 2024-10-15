import { FindingSeverity } from "forta-agent";
import { StakingModule } from "../interfaces";

export const getEventsOfNoticeForStakingModule = (
  stakingModule: StakingModule,
) => {
  const { moduleAddress, moduleName, alertPrefix } = stakingModule;
  return [
    {
      address: moduleAddress,
      event:
        "event TargetValidatorsCountChanged(uint256 indexed nodeOperatorId, uint256 targetValidatorsCount, uint256 targetLimitMode)",
      alertId: `${alertPrefix}NODE-OPERATOR-TARGET-VALIDATORS-COUNT-CHANGED`,
      name: `⚠️ ${moduleName}: Node operator target validators count changed`,
      description: (args: any) =>
        `${moduleName} ` +
        `Node operator ${args.nodeOperatorId} ` +
        `target validators count changed to ${args.targetValidatorsCount}` +
        `${
          args.targetLimitMode
            ? " with targetLimitMode = " + args.targetLimitMode
            : ""
        }`,
      severity: FindingSeverity.Medium,
    },
  ];
};
