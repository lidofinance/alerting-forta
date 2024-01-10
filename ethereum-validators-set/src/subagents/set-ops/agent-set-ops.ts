import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import NODE_OPERATORS_REGISTRY_ABI from "../../abi/NodeOperatorsRegistry.json";
import MEV_ALLOW_LIST_ABI from "../../abi/MEVBoostRelayAllowedList.json";

import {
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";

export const name = "SetOps";

const {
  REPORT_WINDOW,
  MEV_RELAY_COUNT_THRESHOLD_HIGH,
  MEV_RELAY_COUNT_THRESHOLD_INFO,
  MEV_RELAY_COUNT_REPORT_WINDOW,
  MEV_ALLOWED_LIST_ADDRESS,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS,
  MIN_AVAILABLE_KEYS_COUNT,
  MEV_ALLOWED_LIST_EVENTS_OF_NOTICE,
  BLOCK_CHECK_INTERVAL,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge,
);

let lastReportedMevCountInfo = 0;
let lastReportedMevCountHigh = 0;

interface NodeOperatorModuleParams {
  moduleAddress: string;
  alertPrefix: string;
  moduleName: string;
}

class NodeOperatorsRegistryModuleContext {
  public lastReportedKeysShortage = 0;

  constructor(public readonly params: NodeOperatorModuleParams) {}
}

let curatedOperatorsRegistry: NodeOperatorsRegistryModuleContext;
let simpleDvtOperatorsRegistry: NodeOperatorsRegistryModuleContext;

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  curatedOperatorsRegistry = new NodeOperatorsRegistryModuleContext({
    moduleAddress: CURATED_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: 'Curated',
    alertPrefix: '',
  });

  simpleDvtOperatorsRegistry = new NodeOperatorsRegistryModuleContext({
    moduleAddress: SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS,
    moduleName: 'SimpleDVT',
    alertPrefix: 'SDVT-',
  });

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleNodeOperatorsKeys(blockEvent, findings, curatedOperatorsRegistry),
    handleNodeOperatorsKeys(blockEvent, findings, simpleDvtOperatorsRegistry),
    handleMevRelayCount(blockEvent, findings),
  ]);

  return findings;
}

async function handleNodeOperatorsKeys(
  blockEvent: BlockEvent,
  findings: Finding[],
  norContext: NodeOperatorsRegistryModuleContext,
) {
  const now = blockEvent.block.timestamp;
  if (norContext.lastReportedKeysShortage + REPORT_WINDOW < now) {
    const nodeOperatorsRegistry = new ethers.Contract(
      norContext.params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );
    const nodeOperatorsCount =
      await nodeOperatorsRegistry.functions.getActiveNodeOperatorsCount({
        blockTag: blockEvent.block.number,
      });
    let availableKeys: Promise<any>[] = [];
    let availableKeysCount = 0;
    for (let i = 0; i < nodeOperatorsCount; i++) {
      availableKeys.push(
        nodeOperatorsRegistry.functions
          .getUnusedSigningKeyCount(i, {
            blockTag: blockEvent.block.number,
          })
          .then((value) => (availableKeysCount += parseInt(String(value)))),
      );
    }
    await Promise.all(availableKeys);
    if (availableKeysCount < MIN_AVAILABLE_KEYS_COUNT) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ ${norContext.params.moduleName} Few available keys count`,
          description: `There are only ${availableKeysCount} available keys left`,
          alertId: `${norContext.params.alertPrefix}LOW-OPERATORS-AVAILABLE-KEYS-NUM`,
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        }),
      );
      norContext.lastReportedKeysShortage = now;
    }
  }
}

async function handleMevRelayCount(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const blockNumber = blockEvent.block.number;
  if (blockNumber % BLOCK_CHECK_INTERVAL !== 0) {
    return;
  }

  const now = blockEvent.block.timestamp;
  const mevAllowList = new ethers.Contract(
    MEV_ALLOWED_LIST_ADDRESS,
    MEV_ALLOW_LIST_ABI,
    ethersProvider,
  );
  const mevRelays = await mevAllowList.functions.get_relays({
    blockTag: blockEvent.block.number,
  });
  const mevRelaysLength = mevRelays[0].length;
  if (
    mevRelaysLength < MEV_RELAY_COUNT_THRESHOLD_HIGH &&
    lastReportedMevCountHigh + MEV_RELAY_COUNT_REPORT_WINDOW < now
  ) {
    findings.push(
      Finding.fromObject({
        name: "🚨 MEV Allow list: Super low relay count",
        description: `There are only ${mevRelaysLength} relays in the allowed list.`,
        alertId: "MEV-LOW-RELAY-COUNT",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      }),
    );
    lastReportedMevCountInfo = now;
    lastReportedMevCountHigh = now;
  } else if (
    mevRelaysLength < MEV_RELAY_COUNT_THRESHOLD_INFO &&
    lastReportedMevCountInfo + MEV_RELAY_COUNT_REPORT_WINDOW < now
  ) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ MEV Allow list: Low relay count",
        description: `There are only ${mevRelaysLength} relays in the allowed list.`,
        alertId: "MEV-LOW-RELAY-COUNT",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      }),
    );
    lastReportedMevCountInfo = now;
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleEventsOfNotice(txEvent, findings, MEV_ALLOWED_LIST_EVENTS_OF_NOTICE);

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
