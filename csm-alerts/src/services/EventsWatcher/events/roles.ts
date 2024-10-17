import { FindingSeverity, FindingType } from '@fortanetwork/forta-bot'

import { ACL__factory } from '../../../generated/typechain'
import * as ACL from '../../../generated/typechain/ACL'
import { RolesMapping } from '../../../shared/roles'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress } from '../../../utils/string'

const IACL = ACL__factory.createInterface()

export function getRolesMonitoringEvents(
    contracts: { name: string; address: string }[],
): EventOfNotice[] {
    return contracts.flatMap((contract) => {
        return [
            {
                address: contract.address,
                abi: IACL.getEvent('RoleGranted').format('full'),
                alertId: `ROLE-GRANTED`,
                name: `🚨 ${contract.name}: Role granted`,
                description: (args: ACL.RoleGrantedEvent.OutputObject) =>
                    `Role ${args.role} (${RolesMapping[args.role] ?? 'unknown'}) was granted ` +
                    `to ${etherscanAddress(args.account)} on ${etherscanAddress(contract.address)}`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IACL.getEvent('RoleRevoked').format('full'),
                alertId: `ROLE-REVOKED`,
                name: `🚨 ${contract.name}: Role revoked`,
                description: (args: ACL.RoleRevokedEvent.OutputObject) =>
                    `Role ${args.role} (${RolesMapping[args.role] ?? 'unknown'}) was revoked ` +
                    `from ${etherscanAddress(args.account)} on ${etherscanAddress(contract.address)}`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IACL.getEvent('RoleAdminChanged').format('full'),
                alertId: `ROLE-GRANTED`,
                name: `🚨 ${contract.name}: Role's admin role changed`,
                description: (args: ACL.RoleAdminChangedEvent.OutputObject) =>
                    `Admin role of role ${args.role} (${RolesMapping[args.role] ?? 'unknown'}) was changed ` +
                    `from ${args.previousAdminRole} to ${args.newAdminRole} on ${etherscanAddress(contract.address)}`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
        ]
    })
}
