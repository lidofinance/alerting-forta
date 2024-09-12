import { BlockEvent, Finding, FindingSeverity, FindingType, LogDescription, TransactionEvent } from 'forta-agent'

import _ from 'lodash'

import { etherscanAddress } from '../../shared/string'
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
import { ARAGON_ACL_ADDRESS } from 'constants/common'

import * as E from 'fp-ts/Either'
import { elapsedTime } from '../../shared/time'
import { Logger } from 'winston'
import { networkAlert } from '../../shared/errors'
import type { IAclChangesClient } from './contract'

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
  private readonly findingsTimestamps: Map<string, number>

  constructor(logger: Logger, ethProvider: IAclChangesClient) {
    this.logger = logger
    this.ethProvider = ethProvider
    this.findingsTimestamps = new Map<string, number>()
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

    const [rolesMembersFindings, ownerChangeFindings] = await Promise.all([
      this.handleRolesMembers(blockEvent),
      this.handleOwnerChange(blockEvent),
    ])

    findings.push(...rolesMembersFindings, ...ownerChangeFindings)
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

  public async handleRolesMembers(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []
    const roleMembersReports = new Map<string, number>()

    const promises = Array.from(ACL_ENUMERABLE_CONTRACTS.keys()).map(async (address: string) => {
      const lastReportedAt = roleMembersReports.get(address) || 0
      const now = blockEvent.block.timestamp
      if (now - lastReportedAt < NEW_ROLE_MEMBERS_REPORT_INTERVAL) {
        return
      }

      const data = ACL_ENUMERABLE_CONTRACTS.get(address)
      if (!data) {
        return
      }

      await Promise.all(
        Array.from(data.roles.entries()).map(async (entry) => {
          const [role, members] = entry
          const membersInLower = members.map((m) => m.toLowerCase())
          const curMembers = await this.ethProvider.getRoleMembers(address, role.hash, blockEvent.blockNumber)

          if (E.isLeft(curMembers)) {
            out.push(
              networkAlert(
                curMembers.left,
                `Error in ${AclChangesSrv.name}.${this.handleRolesMembers.name} (uid:550c057c)`,
                `Could not call ethProvider.getRoleMembers for address - ${address}`,
              ),
            )
            return
          }

          if (_.isEqual(curMembers.right, membersInLower)) {
            return
          }

          out.push(
            Finding.fromObject({
              name: `🚨 ACL: Unexpected role members`,
              description:
                `Role ${role.name} members of ${data.name} ` +
                `are {${curMembers.right.map((m) => etherscanAddress(m)).join(', ')}}` +
                ` but expected {${membersInLower.map((m) => etherscanAddress(m)).join(', ')}}.` +
                `\nPlease update the constants file if the change was expected.`,
              alertId: 'ACL-UNEXPECTED-ROLE-MEMBERS',
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
            }),
          )

          roleMembersReports.set(address, now)
        }),
      )
    })

    await Promise.all(promises)
    return out
  }

  public async handleOwnerChange(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []

    const promises = Array.from(OWNABLE_CONTRACTS.keys()).map(async (address: string) => {
      const data = OWNABLE_CONTRACTS.get(address)
      if (!data) {
        return
      }

      const curOwner = await this.ethProvider.getContractOwner(address, data.ownershipMethod, blockEvent.blockNumber)

      if (E.isLeft(curOwner)) {
        out.push(
          networkAlert(
            curOwner.left,
            `Error in ${AclChangesSrv.name}.${this.handleOwnerChange.name} (uid:790dc305)`,
            `Could not call ethProvider.getOwner for address - ${address}`,
          ),
        )
        return
      }

      if (WHITELISTED_OWNERS.includes(curOwner.right.toLowerCase())) {
        return
      }

      const curOwnerIsContract = await this.ethProvider.isDeployed(curOwner.right)

      if (E.isLeft(curOwnerIsContract)) {
        out.push(
          networkAlert(
            curOwnerIsContract.left,
            `Error in ${AclChangesSrv.name}.${this.handleRolesMembers.name} (uid:eb602bbc)`,
            `Could not call ethProvider.isDeployed for curOwner - ${curOwner}`,
          ),
        )
        return
      }

      const key = `${address}+${curOwner}`
      const now = blockEvent.block.timestamp
      // skip if reported recently
      const lastReportTimestamp = this.findingsTimestamps.get(key)
      const interval = curOwnerIsContract.right
        ? NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL
        : NEW_OWNER_IS_EOA_REPORT_INTERVAL
      if (lastReportTimestamp && interval > now - lastReportTimestamp) {
        return
      }

      out.push(
        Finding.fromObject({
          name: curOwnerIsContract.right
            ? '🚨 Contract owner set to address not in whitelist'
            : '🚨🚨🚨 Contract owner set to EOA 🚨🚨🚨',
          description: `${data.name} contract (${etherscanAddress(address)}) owner is set to ${
            curOwnerIsContract.right ? 'contract' : 'EOA'
          } address ${etherscanAddress(curOwner.right)}`,
          alertId: 'SUSPICIOUS-CONTRACT-OWNER',
          type: FindingType.Suspicious,
          severity: curOwnerIsContract.right ? FindingSeverity.High : FindingSeverity.Critical,
          metadata: {
            contract: address,
            name: data.name,
            owner: curOwner.right,
          },
        }),
      )

      this.findingsTimestamps.set(key, now)
    })

    await Promise.all(promises)
    return out
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
    const roleLabel = LIDO_ROLES.get(permission.role) || 'unknown'
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
    out.push(
      Finding.fromObject({
        name: `🚨 Aragon ACL: Permission ${shortState}`,
        description: `Role ${permission.role} (${roleLabel}) on the app ${etherscanAddress(permission.app)} (${appLabel}) was ${
          permission.state
        } ${permission.entity} (${entity})`,
        alertId: 'ARAGON-ACL-PERMISSION-CHANGED',
        severity: severity,
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
      const roleLabel = LIDO_ROLES.get(event.args.role) || 'unknown'
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
