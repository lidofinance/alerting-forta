import { EASY_TRACK_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";

export const INCREASE_STAKING_LIMIT_ADDRESS =
  "0xe033673d83a8a60500bce02abd9007ffab587714";
export const EVM_SCRIPT_EXECUTOR_ADDRESS =
  "0x3c9aca237b838c59612d79198685e7f20c7fe783";
export const REWARD_PROGRAMS_REGISTRY_ADDRESS =
  "0x28a08f61ae129d0d8bd4380ae5647e7add0527ca";
export const EASY_TRACK_ADDRESS = "0xaf072c8d368e4dd4a9d4ff6a76693887d6ae92af";
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x9d4af1ee19dad8857db3a45b0374c81c8a1c6320";

export const MOTION_ENACTED_EVENT =
  "event MotionEnacted(uint256 indexed _motionId)";
export const MOTION_CREATED_EVENT =
  "event MotionCreated(uint256 indexed _motionId, address _creator, address indexed _evmScriptFactory, bytes _evmScriptCallData, bytes _evmScript)";

export const EASY_TRACK_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: EASY_TRACK_ADDRESS,
  })
);

export const EASY_TRACK_TYPES_BY_FACTORIES = new Map<string, string>([
  [
    "0xe033673d83a8a60500bce02abd9007ffab587714",
    "Increase node operator staking limit",
  ],
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
