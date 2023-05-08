import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import {
  LIDO_ARAGON_ACL_ADDRESS,
  LIDO_ROLES,
  SET_PERMISSION_EVENT,
  SET_PERMISSION_PARAMS_EVENT,
  LIDO_APPS,
  CHANGE_PERMISSION_MANAGER_EVENT,
  ORDINARY_ENTITIES,
  WHITELISTED_OWNERS,
  OWNABLE_CONTRACTS,
  NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL,
  NEW_OWNER_IS_EOA_REPORT_INTERVAL,
} from "./constants";

import { isContract } from "./utils";

interface IPermission {
  app: string;
  entity: string;
  role: string;
  state: string;
}

const byLogIndexAsc = (e1: any, e2: any) => e1.logIndex - e2.logIndex;

export const name = "ACL Monitor";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await handleSetPermission(txEvent, findings);
  handleChangePermissionManager(txEvent, findings);

  return findings;
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleOwnerChange(blockEvent, findings)]);

  return findings;
}

async function handleSetPermission(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (LIDO_ARAGON_ACL_ADDRESS in txEvent.addresses) {
    let permissions = new Map<string, IPermission>();
    const setEvents = txEvent.filterLog(
      SET_PERMISSION_EVENT,
      LIDO_ARAGON_ACL_ADDRESS
    );
    setEvents.sort(byLogIndexAsc);
    setEvents.forEach((event) => {
      const permissionKey = eventToPermissionKey(event);
      let state = event.args.allowed ? "granted to" : "revoked from";
      let permissionObjOld = permissions.get(permissionKey);
      if (permissionObjOld) {
        permissionObjOld.state = `${permissionObjOld.state} and ${state}`;
        permissions.set(permissionKey, permissionObjOld);
      } else {
        permissions.set(permissionKey, eventToPermissionObj(event, state));
      }
    });

    const setParamsEvents = txEvent.filterLog(
      SET_PERMISSION_PARAMS_EVENT,
      LIDO_ARAGON_ACL_ADDRESS
    );
    setParamsEvents.forEach((event) => {
      const permissionKey = eventToPermissionKey(event);
      let permissionObjOld = permissions.get(permissionKey);
      if (permissionObjOld) {
        permissionObjOld.state = permissionObjOld.state.replace(
          "granted",
          "granted with params"
        );
        permissions.set(permissionKey, permissionObjOld);
      }
    });
    await Promise.all(
      Array.from(permissions.values()).map(async (permission: IPermission) => {
        await handlePermissionChange(permission, findings);
      })
    );
  }
}

async function handlePermissionChange(
  permission: IPermission,
  findings: Finding[]
) {
  const shortState = permission.state.replace(" from", "").replace(" to", "");
  const role = LIDO_ROLES.get(permission.role) || "unknown";
  const app = LIDO_APPS.get(permission.app.toLowerCase()) || "unknown";
  const entityRaw = permission.entity.toLowerCase();
  let severity = FindingSeverity.Info;
  let entity = ORDINARY_ENTITIES.get(entityRaw);
  if (!entity) {
    severity = FindingSeverity.Medium;
    entity = LIDO_APPS.get(entityRaw);
    if (!entity) {
      if (await isContract(entityRaw)) {
        severity = FindingSeverity.High;
        entity = "unknown contract";
      } else {
        severity = FindingSeverity.Critical;
        entity = "unknown EOA";
      }
    }
  }
  findings.push(
    Finding.fromObject({
      name: `🚨 Aragon ACL: Permission ${shortState}`,
      description: `Role ${permission.role} (${role}) on the app ${permission.app} (${app}) was ${permission.state} ${permission.entity} (${entity})`,
      alertId: "ARAGON-ACL-PERMISSION-CHANGED",
      severity: severity,
      type: FindingType.Info,
    })
  );
}

function eventToPermissionKey(event: any) {
  return `${event.args.app}-${event.args.entity}-${event.args.role}`;
}

function eventToPermissionObj(event: any, state: string): IPermission {
  return {
    app: event.args.app,
    entity: event.args.entity,
    role: event.args.role,
    state: state,
  };
}

function handleChangePermissionManager(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (LIDO_ARAGON_ACL_ADDRESS in txEvent.addresses) {
    const managerEvents = txEvent.filterLog(
      CHANGE_PERMISSION_MANAGER_EVENT,
      LIDO_ARAGON_ACL_ADDRESS
    );
    managerEvents.forEach((event) => {
      const role = LIDO_ROLES.get(event.args.role) || "unknown";
      const app = LIDO_APPS.get(event.args.app.toLowerCase()) || "unknown";
      const manager =
        LIDO_APPS.get(event.args.manager.toLowerCase()) || "unknown";
      findings.push(
        Finding.fromObject({
          name: `🚨 Aragon ACL: Permission manager changed`,
          description: `Permission manager for the role ${event.args.role} (${role}) on the app ${event.args.app} (${app}) was set to ${event.args.manager} (${manager})`,
          alertId: "ARAGON-ACL-PERMISSION-MANAGER-CHANGED",
          severity: FindingSeverity.Critical,
          type: FindingType.Info,
        })
      );
    });
  }
}

async function getOwner(
  address: string,
  method: string,
  currentBlock: number
): Promise<any> {
  const abi = [`function ${method}() view returns (address)`];
  const contract = new ethers.Contract(address, abi, ethersProvider);
  return await contract.functions[method]({ blockTag: currentBlock });
}

const findingsTimestamps = new Map<string, number>();

async function handleOwnerChange(blockEvent: BlockEvent, findings: Finding[]) {
  const promises = Array.from(OWNABLE_CONTRACTS.keys()).map(
    async (address: string) => {
      const data = OWNABLE_CONTRACTS.get(address);
      if (!data) return;

      const curOwner = String(
        await getOwner(address, data.ownershipMethod, blockEvent.blockNumber)
      );
      if (WHITELISTED_OWNERS.includes(curOwner)) return;

      const curOwnerIsContract = await isContract(curOwner);

      const key = `${address}+${curOwner}`;
      const now = blockEvent.block.timestamp;
      // skip if reported recently
      const lastReportTimestamp = findingsTimestamps.get(key);
      const interval = curOwnerIsContract
        ? NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL
        : NEW_OWNER_IS_EOA_REPORT_INTERVAL;
      if (lastReportTimestamp && interval > now - lastReportTimestamp) return;

      findings.push(
        Finding.fromObject({
          name: curOwnerIsContract
            ? "🚨 Contract owner set to address not in whitelist"
            : "🚨🚨🚨 Contract owner set to EOA 🚨🚨🚨",
          description: `${data.name} contract (${address}) owner is set to ${
            curOwnerIsContract ? "contract" : "EOA"
          } address ${curOwner}`,
          alertId: "SUSPICIOUS-CONTRACT-OWNER",
          type: FindingType.Suspicious,
          severity: curOwnerIsContract
            ? FindingSeverity.High
            : FindingSeverity.Critical,
          metadata: {
            contract: address,
            name: data.name,
            owner: curOwner,
          },
        })
      );

      findingsTimestamps.set(key, now);
    }
  );

  await Promise.all(promises);
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
