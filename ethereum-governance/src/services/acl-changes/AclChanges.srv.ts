import { BlockEvent, Finding, FindingSeverity, FindingType, LogDescription, TransactionEvent } from 'forta-agent'

import _ from 'lodash'

import { etherscanAddress, roleByName } from '../../shared/string'
import {
  SET_PERMISSION_EVENT,
  SET_PERMISSION_PARAMS_EVENT,
  CHANGE_PERMISSION_MANAGER_EVENT,
} from '../../shared/events/acl_events'

import {
  ACL_ENUMERABLE_CONTRACTS,
  LIDO_ROLES,
  LIDO_APPS,
  ORDINARY_ENTITIES,
  WHITELISTED_OWNERS,
  OWNABLE_CONTRACTS,
  NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL,
  NEW_OWNER_IS_EOA_REPORT_INTERVAL,
  NEW_ROLE_MEMBERS_REPORT_INTERVAL,
} from 'constants/acl-changes'
import { ARAGON_ACL_ADDRESS, SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS } from 'constants/common'

import * as E from 'fp-ts/Either'
import { elapsedTime } from '../../shared/time'
import { Logger } from 'winston'
import { networkAlert } from '../../shared/errors'
import type { IAclChangesClient } from './contract'
import { ContractRolesInfo, OwnableContractInfo } from '../../shared/types'

interface IPermission {
  app: string
  entity: string
  role: string
  state: string
}

const byLogIndexAsc = (e1: LogDescription, e2: LogDescription) => e1.logIndex - e2.logIndex

export class AclChangesSrv {
  private readonly logger: Logger
  private readonly name = 'AclChangesSrv'
  private readonly ethProvider: IAclChangesClient
  private readonly ownersReportsTimestamps: Map<string, number>
  private readonly roleMembersReportsTimestamps: Map<string, number>

  constructor(logger: Logger, ethProvider: IAclChangesClient) {
    this.logger = logger
    this.ethProvider = ethProvider
    this.ownersReportsTimestamps = new Map<string, number>()
    this.roleMembersReportsTimestamps = new Map<string, number>()
  }

  public initialize(currentBlock: number): null {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public eventToPermissionKey(event: LogDescription) {
    return `${event.args.app}-${event.args.entity}-${event.args.role}`
  }
  public eventToPermissionObj(event: LogDescription, state: string): IPermission {
    return {
      app: event.args.app,
      entity: event.args.entity,
      role: event.args.role,
      state: state,
    }
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [roleChanges, ownerChanges] = await Promise.all([
      this.handleRolesMembersChanges(blockEvent),
      this.handleContractsOwnersChanges(blockEvent),
    ])

    findings.push(...roleChanges, ...ownerChanges)
    this.logger.info(elapsedTime(AclChangesSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }
  public async handleTransaction(txEvent: TransactionEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [setPermissionFindings, changePermissionManager] = await Promise.all([
      this.handleSetPermission(txEvent),
      this.handleChangePermissionManager(txEvent),
    ])

    findings.push(...setPermissionFindings, ...changePermissionManager)

    this.logger.debug(elapsedTime(AclChangesSrv.name + '.' + this.handleTransaction.name, start))

    return findings
  }

  public async handleRolesMembersChanges(blockEvent: BlockEvent): Promise<Finding[]> {
    const findings: Finding[] = []
    const currentTimestamp = blockEvent.block.timestamp

    for (const address of ACL_ENUMERABLE_CONTRACTS.keys()) {
      const lastReportTime = this.roleMembersReportsTimestamps.get(address) || 0
      if (currentTimestamp - lastReportTime < NEW_ROLE_MEMBERS_REPORT_INTERVAL) {
        continue
      }

      const aclContractInfo = ACL_ENUMERABLE_CONTRACTS.get(address) as ContractRolesInfo

      for (const [role, members] of aclContractInfo.roles.entries()) {
        const membersInLower = members.map((m) => m.toLowerCase())
        const currentRoleMembers: string[] = []
        const roleMembersFromNetwork = await this.ethProvider.getRoleMembers(address, role.hash, blockEvent.blockNumber)

        if (E.isLeft(roleMembersFromNetwork)) {
          findings.push(
            networkAlert(
              roleMembersFromNetwork.left,
              `Error in ${AclChangesSrv.name}.${this.handleRolesMembersChanges.name} (uid:550c057c)`,
              `Could not call ethProvider.getRoleMembers for address - ${address}`,
            ),
          )
        } else {
          currentRoleMembers.push(...roleMembersFromNetwork.right)
        }

        if (!_.isEqual(currentRoleMembers, membersInLower)) {
          const currentRoleMembersString = E.isLeft(roleMembersFromNetwork)
            ? `UNKNOWN`
            : currentRoleMembers.map((m) => etherscanAddress(m)).join(', ')

          const expectedRoleMembersString = membersInLower.map((m) => etherscanAddress(m)).join(', ')

          findings.push(
            Finding.fromObject({
              name: `🚨 ACL: Unexpected role members`,
              description: `Role ${role.name} members of ${aclContractInfo.name} are {${currentRoleMembersString}} but expected {${expectedRoleMembersString}}.\n\nPlease update the constants file if the change was expected.`,
              alertId: 'ACL-UNEXPECTED-ROLE-MEMBERS',
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
            }),
          )

          this.roleMembersReportsTimestamps.set(address, currentTimestamp)
        }
      }
    }

    return findings
  }

  public async handleContractsOwnersChanges(blockEvent: BlockEvent): Promise<Finding[]> {
    const findings: Finding[] = []

    for (const address of OWNABLE_CONTRACTS.keys()) {
      const ownerInfo = OWNABLE_CONTRACTS.get(address) as OwnableContractInfo

      const contractOwnerResponse = await this.ethProvider.getContractOwner(
        address,
        ownerInfo.ownershipMethod,
        blockEvent.blockNumber,
      )

      if (E.isLeft(contractOwnerResponse)) {
        findings.push(
          networkAlert(
            contractOwnerResponse.left,
            `Error in ${AclChangesSrv.name}.${this.handleContractsOwnersChanges.name} (uid:790dc305)`,
            `Could not call ethProvider.getOwner for address - ${address}`,
          ),
        )

        continue
      }

      const currentOwner = contractOwnerResponse.right.toLowerCase()

      if (!WHITELISTED_OWNERS.includes(currentOwner)) {
        let isOwnerAContract = false
        const isDeployed = await this.ethProvider.isDeployed(currentOwner)

        if (E.isLeft(isDeployed)) {
          findings.push(
            networkAlert(
              isDeployed.left,
              `Error in ${AclChangesSrv.name}.${this.handleRolesMembersChanges.name} (uid:eb602bbc)`,
              `Could not call ethProvider.isDeployed for currentOwner - ${currentOwner}`,
            ),
          )
        } else {
          isOwnerAContract = isDeployed.right
        }

        const currentTimestamp = blockEvent.block.timestamp
        const reportKey = `${address}+${currentOwner}`

        // skip alert if reported recently
        const lastReportTimestamp = this.ownersReportsTimestamps.get(reportKey)
        const reportInterval = isOwnerAContract
          ? NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL
          : NEW_OWNER_IS_EOA_REPORT_INTERVAL

        if (lastReportTimestamp && reportInterval > currentTimestamp - lastReportTimestamp) {
          continue
        }

        findings.push(
          Finding.fromObject({
            name: isOwnerAContract
              ? '🚨 Contract owner set to address not in whitelist'
              : '🚨🚨🚨 Contract owner set to EOA 🚨🚨🚨',
            description: `${ownerInfo.name} contract (${etherscanAddress(address)}) owner is set to ${
              isOwnerAContract ? 'contract' : 'EOA'
            } address ${etherscanAddress(currentOwner)}`,
            alertId: 'SUSPICIOUS-CONTRACT-OWNER',
            severity: isOwnerAContract ? FindingSeverity.High : FindingSeverity.Critical,
            type: FindingType.Suspicious,
            metadata: {
              contract: address,
              name: ownerInfo.name,
              owner: currentOwner,
              isDeployedLoaded: `${!E.isLeft(isDeployed)}`,
            },
          }),
        )

        this.ownersReportsTimestamps.set(reportKey, currentTimestamp)
      }
    }

    return findings
  }

  public async handleSetPermission(txEvent: TransactionEvent) {
    const out: Finding[] = []
    if (!(ARAGON_ACL_ADDRESS in txEvent.addresses)) {
      return out
    }
    const permissions = new Map<string, IPermission>()
    const setEvents = txEvent.filterLog(SET_PERMISSION_EVENT, ARAGON_ACL_ADDRESS)
    setEvents.sort(byLogIndexAsc)
    setEvents.forEach((event) => {
      const permissionKey = this.eventToPermissionKey(event)
      const state = event.args.allowed ? 'granted to' : 'revoked from'
      const permissionObjOld = permissions.get(permissionKey)
      if (permissionObjOld) {
        permissionObjOld.state = `${permissionObjOld.state} and ${state}`
        permissions.set(permissionKey, permissionObjOld)
      } else {
        permissions.set(permissionKey, this.eventToPermissionObj(event, state))
      }
    })

    const setParamsEvents = txEvent.filterLog(SET_PERMISSION_PARAMS_EVENT, ARAGON_ACL_ADDRESS)
    setParamsEvents.forEach((event) => {
      const permissionKey = this.eventToPermissionKey(event)
      const permissionObjOld = permissions.get(permissionKey)
      if (permissionObjOld) {
        permissionObjOld.state = permissionObjOld.state.replace('granted', 'granted with params')
        permissions.set(permissionKey, permissionObjOld)
      }
    })
    await Promise.all(
      Array.from(permissions.values()).map(async (permission: IPermission) => {
        await this.handlePermissionChange(permission, out)
      }),
    )
    return out
  }

  public async handlePermissionChange(permission: IPermission, out: Finding[]) {
    const shortState = permission.state.replace(' from', '').replace(' to', '')
    const roleLabel = LIDO_ROLES[permission.role] ?? 'unknown'
    const appLabel = LIDO_APPS.get(permission.app.toLowerCase()) || 'unknown'
    const entityRaw = permission.entity.toLowerCase()
    let severity = FindingSeverity.Info
    let entity = ORDINARY_ENTITIES.get(entityRaw)
    if (!entity) {
      severity = FindingSeverity.Medium
      entity = LIDO_APPS.get(entityRaw)
      if (!entity) {
        const isContract = await this.ethProvider.isDeployed(entityRaw)

        if (E.isLeft(isContract)) {
          out.push(
            networkAlert(
              isContract.left,
              `Error in ${AclChangesSrv.name}.${this.handlePermissionChange.name} (uid:790dc305)`,
              `Could not call ethProvider.isDeployed for address - ${entityRaw}`,
            ),
          )
          return
        }

        if (isContract.right) {
          severity = FindingSeverity.High
          entity = 'unknown contract'
        } else {
          severity = FindingSeverity.Critical
          entity = 'unknown EOA'
        }
      }
    }

    // When new NOs are being added to the SDVT registry, the permission alert shouldn't be critical
    const isSdvtOperatorBeingAdded =
      shortState === 'granted with params' &&
      permission.app.toLowerCase() === SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS.toLowerCase() &&
      permission.role === roleByName('MANAGE_SIGNING_KEYS').hash

    if (isSdvtOperatorBeingAdded) {
      severity = FindingSeverity.Info
      entity = 'new SDVT operator'
    }

    const icon = severity === FindingSeverity.Info ? 'ℹ️' : '🚨'

    out.push(
      Finding.fromObject({
        name: `${icon} Aragon ACL: Permission ${shortState}`,
        description: `Role ${permission.role} (${roleLabel}) on the app ${etherscanAddress(permission.app)} (${appLabel}) was ${
          permission.state
        } ${permission.entity} (${entity})`,
        alertId: 'ARAGON-ACL-PERMISSION-CHANGED',
        severity,
        type: FindingType.Info,
      }),
    )
  }

  public handleChangePermissionManager(txEvent: TransactionEvent) {
    const out: Finding[] = []
    if (!(ARAGON_ACL_ADDRESS in txEvent.addresses)) {
      return out
    }

    const managerEvents = txEvent.filterLog(CHANGE_PERMISSION_MANAGER_EVENT, ARAGON_ACL_ADDRESS)
    managerEvents.forEach((event) => {
      const roleLabel = LIDO_ROLES[event.args.role] ?? 'unknown'
      const appLabel = LIDO_APPS.get(event.args.app.toLowerCase()) || 'unknown'
      const managerLabel = LIDO_APPS.get(event.args.manager.toLowerCase()) || 'unknown'
      out.push(
        Finding.fromObject({
          name: `🚨 Aragon ACL: Permission manager changed`,
          description: `Permission manager for the role ${event.args.role} (${roleLabel}) on the app ${etherscanAddress(
            event.args.app,
          )} (${appLabel}) was set to ${etherscanAddress(event.args.manager)} (${managerLabel})`,
          alertId: 'ARAGON-ACL-PERMISSION-MANAGER-CHANGED',
          severity: FindingSeverity.Critical,
          type: FindingType.Info,
        }),
      )
    })
    return out
  }
}
