import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import _ from "lodash";
import { BlockTag } from "@ethersproject/providers";

import { ethersProvider } from "../../ethers";

import { isContract } from "./utils";
import {
  etherscanAddress,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";

interface IPermission {
  app: string;
  entity: string;
  role: string;
  state: string;
}

const byLogIndexAsc = (e1: any, e2: any) => e1.logIndex - e2.logIndex;

export const name = "ACL Monitor";

import type * as Constants from "./constants";
const {
  ACLEnumerableABI,
  ACL_ENUMERABLE_CONTRACTS,
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
  NEW_ROLE_MEMBERS_REPORT_INTERVAL,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

export const roleMembersReports = new Map<string, number>();

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

  await Promise.all([
    handleRolesMembers(blockEvent, findings),
    handleOwnerChange(blockEvent, findings),
  ]);

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
      description: `Role ${
        permission.role
      } (${role}) on the app ${etherscanAddress(permission.app)} (${app}) was ${
        permission.state
      } ${permission.entity} (${entity})`,
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
          description: `Permission manager for the role ${
            event.args.role
          } (${role}) on the app ${etherscanAddress(
            event.args.app
          )} (${app}) was set to ${etherscanAddress(
            event.args.manager
          )} (${manager})`,
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
          description: `${data.name} contract (${etherscanAddress(
            address
          )}) owner is set to ${
            curOwnerIsContract ? "contract" : "EOA"
          } address ${etherscanAddress(curOwner)}`,
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

async function handleRolesMembers(blockEvent: BlockEvent, findings: Finding[]) {
  const promises = Array.from(ACL_ENUMERABLE_CONTRACTS.keys()).map(
    async (address: string) => {
      const lastReportedAt = roleMembersReports.get(address) || 0;
      const now = blockEvent.block.timestamp;
      if (now - lastReportedAt < NEW_ROLE_MEMBERS_REPORT_INTERVAL) {
        return;
      }

      const data = ACL_ENUMERABLE_CONTRACTS.get(address);
      if (!data) return;

      await Promise.all(
        Array.from(data.roles.entries()).map(async (entry) => {
          const [role, members] = entry;
          const membersInLower = members.map((m) => m.toLowerCase());
          const curMembers = await getRoleMembers(
            address,
            role.hash,
            blockEvent.blockNumber
          );
          if (_.isEqual(curMembers, membersInLower)) return;

          findings.push(
            Finding.fromObject({
              name: `🚨 ACL: Role members changed`,
              description: `Role ${role.name} members of ${
                data.name
              } changed to [${curMembers
                .map((m) => etherscanAddress(m))
                .join(", ")}]`,
              alertId: "ACL-ROLE-MEMBERS-CHANGED",
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
            })
          );

          roleMembersReports.set(address, now);
        })
      );
    }
  );

  await Promise.all(promises);
}

export async function getRoleMembers(
  address: string,
  hash: string,
  currentBlock: BlockTag
): Promise<Array<string>> {
  const contract = new ethers.Contract(
    address,
    ACLEnumerableABI,
    ethersProvider
  );

  const count = await contract.functions.getRoleMemberCount(hash, {
    blockTag: currentBlock,
  });
  if (Number(count) === 0) return [];

  const members = [];
  for (let i = 0; i < Number(count); i++) {
    const member = await contract.functions.getRoleMember(hash, i, {
      blockTag: currentBlock,
    });
    members.push(String(member).toLowerCase());
  }
  return members;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
