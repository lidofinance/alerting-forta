import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import {
  LIDO_ARAGON_ACL_ADDRESS,
  LIDO_ROLES,
  SET_PERMISSION_EVENT,
  SET_PERMISSION_PARAMS_EVENT,
  LIDO_APPS,
  CHANGE_PERMISSION_MANAGER_EVENT,
  ORDINARY_ENTITIES,
} from "./constants";

import { isContract } from "./utils/tools";

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

  await handleOwnerChange(txEvent, findings);

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
      name: `Aragon ACL: Permission ${shortState}`,
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
          name: `Aragon ACL: Permission manager changed`,
          description: `Permission manager for the role ${event.args.role} (${role}) on the app ${event.args.app} (${app}) was set to ${event.args.manager} (${manager})`,
          alertId: "ARAGON-ACL-PERMISSION-MANAGER-CHANGED",
          severity: FindingSeverity.High,
          type: FindingType.Info,
        })
      );
    });
  }
}

// TODO: move to consts
const OWNER_CHANGE_EVENT = "event ownerChanged(address indexed newOwner)";
const WHITELISTED_OWNERS = ["0xdb149235b6f40dc08810aa69869783be101790e7"];
const OWNABLE_CONTRACTS = ["0x442af784a788a5bd6f42a01ebe9f287a871243fb"];

async function handleOwnerChange(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  for (const contract of OWNABLE_CONTRACTS) {
    if (contract in txEvent.addresses) {
      const events = txEvent.filterLog(OWNER_CHANGE_EVENT, contract);
      for (const event of events) {
        const newOwner = event.args.newOwner;
        if (!WHITELISTED_OWNERS.includes(newOwner)) {
          const newOwnerIsContract = await isContract(newOwner);
          const severity = newOwnerIsContract
            ? FindingSeverity.High
            : FindingSeverity.Critical;
          findings.push(
            Finding.fromObject({
              name: "Contract owner has been changed",
              description: `Contract ${contract} owner changed to ${
                newOwnerIsContract ? "contract" : "EOA"
              } address ${newOwner}`,
              alertId: "CONTRACT-OWNER-CHANGED",
              type: FindingType.Info,
              severity,
              metadata: {
                contract,
                newOwner,
              },
            })
          );
        }
      }
    }
  }
}
