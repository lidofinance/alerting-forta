import { EASY_TRACK_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";
import {
  EASY_TRACK_ADDRESS as etAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  INCREASE_STAKING_LIMIT_ADDRESS as increaseStakingLimitAddress,
  EVM_SCRIPT_EXECUTOR_ADDRESS as evmScriptExecutorsAddress,
  REWARD_PROGRAMS_REGISTRY_ADDRESS as rewardProgramRegistryAddress,
} from "../../common/constants.testnet";

export const INCREASE_STAKING_LIMIT_ADDRESS = increaseStakingLimitAddress;
export const EVM_SCRIPT_EXECUTOR_ADDRESS = evmScriptExecutorsAddress;
export const REWARD_PROGRAMS_REGISTRY_ADDRESS = rewardProgramRegistryAddress;
export const EASY_TRACK_ADDRESS = etAddress;
export const NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;

export const EASY_TRACK_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: EASY_TRACK_ADDRESS,
  })
);

export const EASY_TRACK_TYPES_BY_FACTORIES = new Map<string, string>([
  [increaseStakingLimitAddress, "Increase node operator staking limit"],
  ["0xe54ca3e867c52a34d262e94606c7a9371ab820c9", "Add referral partner"],
  ["0x2a0c343087c6cfb721ffa20608a6ed0473c71275", "Remove referral partner"],
  ["0xb1e898fac74c377bef16712ba1cd4738606c19ee", "Top up referral partner"],
  ["0x3ef70849fdbee7b1f0a43179a3f788a8949b8abe", "Add recipient (reWARDS)"],
  ["0x6c2e12d9c1d6e3de146a7519ecbcb79c96fe3146", "Remove recipient (reWARDS)"],
  ["0xd928dc9e4dabee939d3237a4f41983ff5b6308db", "Top up recipients (reWARDS)"],
  [
    "0xc39dd5b66968e364d99e0c9e7089049351ab89ca",
    "Top up recipients (Lego LDO)",
  ],
  [
    "0xbf44ec2b23ca105f8a62e0587900a09a473288c6",
    "Top up recipients (Lego DAI)",
  ],
  ["0xd0411e7c4a24e7d4509d5f13aed19aeb8e5644ab", "Top up recipients (RCC DAI)"],
  ["0xc749ad24572263887bc888d3cb854fcd50eccb61", "Top up recipients (PML DAI)"],
  ["0xf4b8b5760ee4b5c5cb154edd0f0841465d821006", "Top up recipients (ATC DAI)"],
  [
    "0x9534a77029d57e249c467e5a1e0854cc26cd75a0",
    "Top up recipients (Referral Program DAI)",
  ],
  ["0x43f33c52156d1fb2ea24d82abfd342e69835e79f", "Top up recipients (TRP LDO)"],
]);
