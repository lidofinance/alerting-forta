import { AclChangesSrv } from './AclChanges.srv'
import { BlockEvent, Finding, FindingSeverity, FindingType, LogDescription, TransactionEvent } from 'forta-agent'
import { Logger } from 'winston'
import { IAclChangesClient } from './contract'
import * as E from 'fp-ts/Either'
import * as constants from '../../shared/constants/acl-changes/mainnet'
import {
  ACL_ENUMERABLE_CONTRACTS,
  IHasRoles,
  IOwnable,
  NEW_ROLE_MEMBERS_REPORT_INTERVAL,
  OWNABLE_CONTRACTS,
  ROLES_OWNERS,
  WHITELISTED_OWNERS,
} from '../../shared/constants/acl-changes/mainnet'
import {
  ARAGON_ACL_ADDRESS,
  ARAGON_VOTING_ADDRESS,
  DEPOSIT_SECURITY_ADDRESS as dsAddress,
  LIDO_DAO_ADDRESS,
  ORACLE_DAEMON_CONFIG_ADDRESS as oracleConfigAddress,
} from '../../shared/constants/common/mainnet'
import { etherscanAddress, INamedRole, roleByName } from '../../shared/string'
import { SET_PERMISSION_PARAMS_EVENT } from '../../shared/events/acl_events'
import { networkAlert } from '../../shared/errors'
import { expect } from '@jest/globals'

describe('AclChangesSrv', () => {
  let logger: Logger
  let ethProvider: IAclChangesClient
  let aclChangesSrv: AclChangesSrv
  let blockEvent: BlockEvent
  let txEvent: TransactionEvent
  let whitelistedOwner: string

  const roleMembersMap = new Map<string, string[]>()
  ACL_ENUMERABLE_CONTRACTS.forEach((contract, address) => {
    Array.from(contract.roles.entries()).forEach(([role, members]) => {
      roleMembersMap.set(role.hash + address, members)
    })
  })
  const fakeAddress = '0x123'

  beforeEach(() => {
    whitelistedOwner = WHITELISTED_OWNERS[0]
    logger = { info: jest.fn() } as unknown as Logger
    ethProvider = {
      getRoleMembers: jest.fn(),
      getOwner: jest.fn(),
      isDeployed: jest.fn(),
    } as unknown as IAclChangesClient
    aclChangesSrv = new AclChangesSrv(logger, ethProvider)
    blockEvent = { block: { number: 100, timestamp: NEW_ROLE_MEMBERS_REPORT_INTERVAL * 2 } } as BlockEvent
    txEvent = { addresses: { '0x123': true }, filterLog: jest.fn() } as unknown as TransactionEvent
  })

  it('initializes without error', () => {
    expect(() => aclChangesSrv.initialize(100)).not.toThrow()
  })

  it('returns the correct name', () => {
    expect(aclChangesSrv.getName()).toBe('AclChangesSrv')
  })

  it('handles block without error', async () => {
    jest.spyOn(aclChangesSrv, 'handleRolesMembers').mockResolvedValue([])
    jest.spyOn(aclChangesSrv, 'handleOwnerChange').mockResolvedValue([])

    const findings = await aclChangesSrv.handleBlock(blockEvent)

    expect(findings).toEqual([])
  })

  it('handles transaction without error', async () => {
    jest.spyOn(aclChangesSrv, 'handleSetPermission').mockResolvedValue([])
    jest.spyOn(aclChangesSrv, 'handleChangePermissionManager').mockResolvedValue([] as never)

    const findings = await aclChangesSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
  })

  it('handles roles members without error', async () => {
    jest.spyOn(ethProvider, 'getRoleMembers').mockImplementation(async (address, roleHash) => {
      return E.right(roleMembersMap.get(roleHash + address) || [])
    })

    const findings = await aclChangesSrv.handleRolesMembers(blockEvent)

    expect(findings).toEqual([])
  })

  it('handles roles members with findings', async () => {
    jest.mock('../../shared/constants/acl-changes/mainnet')
    jest.mocked(constants).ACL_ENUMERABLE_CONTRACTS = new Map<string, IHasRoles>([
      [
        oracleConfigAddress,
        {
          name: 'OracleDaemonConfig',
          roles: new Map<INamedRole, string[]>([[roleByName('DEFAULT_ADMIN_ROLE'), [ROLES_OWNERS.agent]]]),
        },
      ],
    ]) as never
    jest.spyOn(ethProvider, 'getRoleMembers').mockImplementation(async () => {
      return E.right([fakeAddress])
    })

    const findings = await aclChangesSrv.handleRolesMembers(blockEvent)

    expect(findings).toEqual([
      Finding.fromObject({
        alertId: 'ACL-UNEXPECTED-ROLE-MEMBERS',
        description: `Role DEFAULT ADMIN ROLE members of OracleDaemonConfig are {[${fakeAddress}](https://etherscan.io/address/${fakeAddress})} but expected {[${ROLES_OWNERS.agent}](https://etherscan.io/address/${ROLES_OWNERS.agent})}.\nPlease update the constants file if the change was expected.`,
        name: '🚨 ACL: Unexpected role members',
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      }),
    ])
  })

  it('handles owner change without errors', async () => {
    jest.spyOn(ethProvider, 'getOwner').mockResolvedValue(E.right(whitelistedOwner))

    const findings = await aclChangesSrv.handleOwnerChange(blockEvent)

    expect(findings).toEqual([])
  })

  it('handles owner change with error', async () => {
    jest.spyOn(ethProvider, 'getOwner').mockResolvedValue(E.left(new Error('Test error')))
    const finding = networkAlert(
      new Error('Test error'),
      `Error in AclChangesSrv.handleOwnerChange (uid:790dc305)`,
      `Could not call ethProvider.getOwner for address - ${dsAddress}`,
    )

    const findings = await aclChangesSrv.handleOwnerChange(blockEvent)

    expect(findings).toHaveLength(OWNABLE_CONTRACTS.size)
    expect(findings[0].name).toEqual(finding.name)
    expect(findings[0].description).toEqual(finding.description)
    expect(findings[0].alertId).toEqual(finding.alertId)
  })

  it.each([
    [
      'new owner is contract',
      true,
      {
        name: '🚨 Contract owner set to address not in whitelist',
        description: `Deposit Security module contract (${etherscanAddress(dsAddress)}) owner is set to contract address ${etherscanAddress(fakeAddress)}`,
        alertId: 'SUSPICIOUS-CONTRACT-OWNER',
        type: FindingType.Suspicious,
        severity: FindingSeverity.High,
        metadata: {
          contract: dsAddress,
          name: 'Deposit Security module',
          owner: fakeAddress,
        },
      },
    ],
    [
      'new owner is EOA',
      false,
      {
        name: '🚨🚨🚨 Contract owner set to EOA 🚨🚨🚨',
        description: `Deposit Security module contract (${etherscanAddress(dsAddress)}) owner is set to EOA address ${etherscanAddress(fakeAddress)}`,
        alertId: 'SUSPICIOUS-CONTRACT-OWNER',
        type: FindingType.Suspicious,
        severity: FindingSeverity.Critical,
        metadata: {
          contract: dsAddress,
          name: 'Deposit Security module',
          owner: fakeAddress,
        },
      },
    ],
  ])('handles owner change with findings: %p', async (name, isContract, assertedObject) => {
    jest.spyOn(ethProvider, 'getOwner').mockResolvedValue(E.right(fakeAddress))
    jest.spyOn(ethProvider, 'isDeployed').mockResolvedValue(E.right(isContract))
    jest.mock('../../shared/constants/acl-changes/mainnet')
    jest.mocked(constants).OWNABLE_CONTRACTS = new Map<string, IOwnable>([
      [
        dsAddress,
        {
          name: 'Deposit Security module',
          ownershipMethod: 'getOwner',
        },
      ],
    ]) as never

    const findings = await aclChangesSrv.handleOwnerChange(blockEvent)

    expect(findings).toEqual([Finding.fromObject(assertedObject)])
  })

  it('handles set permission without error - no aragon address in tx', async () => {
    const findings = await aclChangesSrv.handleSetPermission(txEvent)

    expect(findings).toEqual([])
  })

  it('handles set permission without error - no permission changes in transactions', async () => {
    txEvent = { addresses: { [ARAGON_ACL_ADDRESS]: true }, filterLog: jest.fn() } as unknown as TransactionEvent
    jest.spyOn(txEvent, 'filterLog').mockReturnValue([])

    const findings = await aclChangesSrv.handleSetPermission(txEvent)

    expect(findings).toEqual([])
  })

  it('handles set permission with error', async () => {
    const fakeAddress = '0x456'
    txEvent = { addresses: { [ARAGON_ACL_ADDRESS]: true }, filterLog: jest.fn() } as unknown as TransactionEvent
    jest.spyOn(txEvent, 'filterLog').mockReturnValue([
      {
        args: {
          app: '0x123',
          entity: fakeAddress,
          role: '0x789',
          allowed: true,
        },
      } as unknown as LogDescription,
    ])
    jest.spyOn(ethProvider, 'isDeployed').mockResolvedValue(E.left(Error('Test error')))
    const finding = networkAlert(
      new Error('Test error'),
      `Error in AclChangesSrv.handlePermissionChange (uid:790dc305)`,
      `Could not call ethProvider.isDeployed for address - ${fakeAddress}`,
    )

    const findings = await aclChangesSrv.handleSetPermission(txEvent)

    expect(findings[0].name).toEqual(finding.name)
    expect(findings[0].description).toEqual(finding.description)
    expect(findings[0].alertId).toEqual(finding.alertId)
  })

  it.each([
    {
      description: 'Single event when permission was granted for an address of unknown contract',
      isContract: true,
      granted: true,
      isSingleEvent: true,
      withParams: true,
      expectedSeverity: FindingSeverity.High,
      expectedName: '🚨 Aragon ACL: Permission granted with params',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was granted with params to 0x456 (unknown contract)',
    },
    {
      description: 'Single event when permission was granted with params for an address of unknown EOA',
      isContract: false,
      granted: true,
      isSingleEvent: true,
      withParams: true,
      expectedSeverity: FindingSeverity.Critical,
      expectedName: '🚨 Aragon ACL: Permission granted with params',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was granted with params to 0x456 (unknown EOA)',
    },
    {
      description: 'Single event when permission was granted for an address of unknown contract',
      isContract: true,
      granted: false,
      isSingleEvent: true,
      withParams: true,
      expectedSeverity: FindingSeverity.High,
      expectedName: '🚨 Aragon ACL: Permission revoked',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was revoked from 0x456 (unknown contract)',
    },
    {
      description:
        'Multiple events when permission was revoked and granted with params for an address of unknown contract',
      isContract: true,
      granted: true,
      isSingleEvent: false,
      withParams: true,
      expectedSeverity: FindingSeverity.High,
      expectedName: '🚨 Aragon ACL: Permission granted with params and revoked',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was granted with params to and revoked from 0x456 (unknown contract)',
    },
    {
      description: 'Single event when permission was granted without params for an address of unknown contract',
      isContract: true,
      granted: true,
      isSingleEvent: true,
      withParams: false,
      expectedSeverity: FindingSeverity.High,
      expectedName: '🚨 Aragon ACL: Permission granted',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was granted to 0x456 (unknown contract)',
    },
    {
      description: 'Single event when permission was granted without params for an address of unknown EOA',
      isContract: false,
      granted: true,
      isSingleEvent: true,
      withParams: false,
      expectedSeverity: FindingSeverity.Critical,
      expectedName: '🚨 Aragon ACL: Permission granted',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was granted to 0x456 (unknown EOA)',
    },
    {
      // To clarify: maybe unused case
      description: 'Single event when permission was revoked without params for an address of unknown contract',
      isContract: true,
      granted: false,
      isSingleEvent: true,
      withParams: false,
      expectedSeverity: FindingSeverity.High,
      expectedName: '🚨 Aragon ACL: Permission revoked',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was revoked from 0x456 (unknown contract)',
    },
    {
      description:
        'Multiple events when permission was revoked and granted without params for an address of unknown contract',
      isContract: true,
      granted: true,
      isSingleEvent: false,
      withParams: false,
      expectedSeverity: FindingSeverity.High,
      expectedName: '🚨 Aragon ACL: Permission granted and revoked',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was granted to and revoked from 0x456 (unknown contract)',
    },
    {
      description:
        'Multiple events when permission was revoked and granted without params for an address of unknown EOA',
      isContract: false,
      granted: true,
      isSingleEvent: false,
      withParams: false,
      expectedSeverity: FindingSeverity.Critical,
      expectedName: '🚨 Aragon ACL: Permission granted and revoked',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was granted to and revoked from 0x456 (unknown EOA)',
    },
    {
      description:
        'Multiple events when permission was revoked and granted without params for an address of unknown contract',
      isContract: true,
      granted: false,
      isSingleEvent: false,
      withParams: false,
      expectedSeverity: FindingSeverity.High,
      expectedName: '🚨 Aragon ACL: Permission revoked and granted',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was revoked from and granted to 0x456 (unknown contract)',
    },
    {
      description:
        'Multiple events when permission was revoked and granted without params for an address of unknown EOA',
      isContract: false,
      granted: false,
      isSingleEvent: false,
      withParams: false,
      expectedSeverity: FindingSeverity.Critical,
      expectedName: '🚨 Aragon ACL: Permission revoked and granted',
      expectedDescription:
        'Role 0x789 (unknown) on the app [0x123](https://etherscan.io/address/0x123) (unknown) was revoked from and granted to 0x456 (unknown EOA)',
    },
  ])(
    'handles set permission with findings when permission changes in transactions with conditions:\n $description',
    async ({ isContract, granted, isSingleEvent, withParams, expectedSeverity, expectedName, expectedDescription }) => {
      const txEvent = { addresses: { [ARAGON_ACL_ADDRESS]: true }, filterLog: jest.fn() } as unknown as TransactionEvent
      const logEvents = [
        {
          args: {
            app: '0x123',
            entity: '0x456',
            role: '0x789',
            allowed: granted,
          },
        } as unknown as LogDescription,
      ]
      jest.spyOn(txEvent, 'filterLog').mockImplementation((event) => {
        if (!withParams && event === SET_PERMISSION_PARAMS_EVENT) {
          // return empty array to simulate permission params events absence
          return []
        }

        if (isSingleEvent || event === SET_PERMISSION_PARAMS_EVENT) {
          // return single event to simulate single permission change or permission params event
          return logEvents
        }

        // return multiple events to simulate multiple permission changes
        return [
          ...logEvents,
          {
            args: {
              app: '0x123',
              entity: '0x456',
              role: '0x789',
              allowed: !granted,
            },
          } as unknown as LogDescription,
        ]
      })
      jest.spyOn(ethProvider, 'isDeployed').mockResolvedValue(E.right(isContract))

      const findings = await aclChangesSrv.handleSetPermission(txEvent)

      expect(findings).toHaveLength(1)
      expect(findings[0]).toEqual(
        Finding.fromObject({
          alertId: 'ARAGON-ACL-PERMISSION-CHANGED',
          description: expectedDescription,
          name: expectedName,
          severity: expectedSeverity,
          type: FindingType.Info,
        }),
      )
    },
  )

  it('handles change permission manager without error - no aragon address in tx', async () => {
    const findings = aclChangesSrv.handleChangePermissionManager(txEvent)

    expect(findings).toEqual([])
  })

  it('handles change permission manager without error - no change manager events in tx', async () => {
    txEvent = { addresses: { [ARAGON_ACL_ADDRESS]: true }, filterLog: jest.fn() } as unknown as TransactionEvent
    jest.spyOn(txEvent, 'filterLog').mockReturnValue([])

    const findings = aclChangesSrv.handleChangePermissionManager(txEvent)

    expect(findings).toEqual([])
  })

  it.each([
    [['0x123', '0x456', '0x789'], 'unknown', 'unknown', 'unknown'],
    [
      [ARAGON_VOTING_ADDRESS, LIDO_DAO_ADDRESS, '0xb6d92708f3d4817afc106147d969e229ced5c46e65e0a5002a0d391287762bd0'],
      'Aragon Voting',
      'Lido DAO',
      'APP MANAGER ROLE',
    ],
  ])('handles change permission manager with findings', async (creds, expectedApp, expectedManager, expectedRole) => {
    txEvent = { addresses: { [ARAGON_ACL_ADDRESS]: true }, filterLog: jest.fn() } as unknown as TransactionEvent
    const [app, manager, role] = creds
    jest.spyOn(txEvent, 'filterLog').mockReturnValue([
      {
        args: {
          role: role,
          app: app,
          manager: manager,
        },
      } as unknown as LogDescription,
    ])

    const findings = aclChangesSrv.handleChangePermissionManager(txEvent)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toEqual(
      Finding.fromObject({
        alertId: 'ARAGON-ACL-PERMISSION-MANAGER-CHANGED',
        description: `Permission manager for the role ${role} (${expectedRole}) on the app ${etherscanAddress(
          app,
        )} (${expectedApp}) was set to ${etherscanAddress(manager)} (${expectedManager})`,
        name: '🚨 Aragon ACL: Permission manager changed',
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      }),
    )
  })
})
