import { Finding, TransactionEvent, ethers } from "forta-agent";
import { RedefineMode, requireWithTier } from "../../common/utils";
import type * as Constants from "./constants";
import { EventsOfNotice, getEventsOfNoticeForSafe } from "./utils";
import { GnosisSafeFortaHandler } from "./gnosis-safe-handler";

const { BLOCKCHAIN_INFO, MODULE_MANAGERS } = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge,
);

export const name = "ModuleManagers";

interface ModuleManagerParams {
  moduleManagerAddress: string;
  moduleManagerName: string;
  alertPrefix: string;
  eventsOfNotice: EventsOfNotice[];
}

class ModuleManagerMultisig {
  public readonly safeHandler: GnosisSafeFortaHandler;

  constructor(public readonly params: ModuleManagerParams) {
    this.safeHandler = new GnosisSafeFortaHandler(
      params.moduleManagerAddress,
      params.moduleManagerName,
    );
  }
}

const moduleManagerMultisigList: ModuleManagerMultisig[] = [];

export async function initialize(): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  for (const {
    moduleManagerAddress,
    moduleManagerName,
    alertPrefix,
  } of MODULE_MANAGERS) {
    const eventsOfNotice = getEventsOfNoticeForSafe(
      alertPrefix,
      moduleManagerName,
      {
        safeUrlPrefix: BLOCKCHAIN_INFO.safeUrlPrefix,
        txUrlPrefix: BLOCKCHAIN_INFO.txUrlPrefix,
        safeTxUrlPrefix: BLOCKCHAIN_INFO.safeTxUrlPrefix,
      },
    );

    moduleManagerMultisigList.push(
      new ModuleManagerMultisig({
        moduleManagerAddress,
        moduleManagerName,
        alertPrefix,
        eventsOfNotice,
      }),
    );
  }

  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  let resultFindings: Finding[] = [];

  for (const moduleManager of moduleManagerMultisigList) {
    const stakingModuleFindings = await handleModuleManager(
      txEvent,
      moduleManager,
    );
    resultFindings = [...resultFindings, ...stakingModuleFindings];
  }

  return resultFindings;
}

async function handleModuleManager(
  txEvent: TransactionEvent,
  moduleManager: ModuleManagerMultisig,
): Promise<Finding[]> {
  let findings: Finding[] = [];
  const { params } = moduleManager;

  if (!(params.moduleManagerAddress in txEvent.addresses)) {
    return findings;
  }

  for (const eventInfo of params.eventsOfNotice) {
    const newFindings = await moduleManager.safeHandler.handleTransaction(
      txEvent,
      eventInfo,
    );
    findings = [...findings, ...newFindings];
  }

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
