import { FindingSeverity, FindingType, ethers } from '@fortanetwork/forta-bot'

import { RolesMapping } from '../../../shared/roles'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress } from '../../../utils/string'

export function getRolesMonitoringEvents(
    contracts: { name: string; address: string }[],
): EventOfNotice[] {
    return contracts.flatMap((contract) => {
        return [
            {
                address: contract.address,
                abi: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
                alertId: `ROLE-GRANTED`,
                name: `🚨 ${contract.name}: Role granted`,
                description: (args: ethers.Result) =>
                    `Role ${args.role} (${RolesMapping[args.role] ?? 'unknown'}) was granted to ${etherscanAddress(args.account)} on ${etherscanAddress(contract.address)}`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
                alertId: `ROLE-REVOKED`,
                name: `🚨 ${contract.name}: Role revoked`,
                description: (args: ethers.Result) =>
                    `Role ${args.role} (${RolesMapping[args.role] ?? 'unknown'}) was revoked from ${etherscanAddress(args.account)} on ${etherscanAddress(contract.address)}`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
        ]
    })
}
