import { FindingSeverity } from "forta-agent";
import { etherscanAddress } from "../../common/utils";
import { TRP_FACTORY_ADDRESS as trpFactoryAddress } from "../../common/constants";

export const TRP_FACTORY_ADDRESS = trpFactoryAddress;

export const TRP_EVENTS_OF_NOTICE = [
  {
    address: TRP_FACTORY_ADDRESS,
    event: "event VotingAdapterUpgraded(address voting_adapter)",
    alertId: "TRP-VOTING-ADAPTER-UPGRADED",
    name: "🚨 TRP Factory: Voting adapter upgraded",
    description: (args: any) =>
      `Voting adapter was upgraded to ${etherscanAddress(args.voting_adapter)}`,
    severity: FindingSeverity.High,
  },
  {
    address: TRP_FACTORY_ADDRESS,
    event: "event OwnerChanged(address owner)",
    alertId: "TRP-OWNER-CHANGED",
    name: "🚨 TRP Factory: Owner changed",
    description: (args: any) =>
      `Owner of the TRP factory and all vestings was changed to ${etherscanAddress(
        args.owner,
      )}`,
    severity: FindingSeverity.High,
  },
  {
    address: TRP_FACTORY_ADDRESS,
    event: "event ManagerChanged(address manager)",
    alertId: "TRP-MANAGER-CHANGED",
    name: "🚨 TRP Factory: Manager changed",
    description: (args: any) =>
      `Manager of the TRP factory and all vestings was changed to ${etherscanAddress(
        args.manager,
      )}`,
    severity: FindingSeverity.High,
  },
];
