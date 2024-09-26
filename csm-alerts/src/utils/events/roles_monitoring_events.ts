import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { Result } from '@ethersproject/abi/lib'
import { DeploymentAddresses } from '../constants.holesky'

interface RolesMonitoringContract {
  name: string
  address: string
}

export function getRolesMonitoringEvents(ROLES_MONITORING_CONTRACTS: RolesMonitoringContract[]): EventOfNotice[] {
  return ROLES_MONITORING_CONTRACTS.flatMap((contractInfo: RolesMonitoringContract) => {
    return [
      {
        address: contractInfo.address,
        abi: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
        alertId: `ROLE-GRANTED`,
        name: `🚨 ${contractInfo.name}: Role granted`,
        description: (args: Result) =>
          `Role ${args.role}(${DeploymentAddresses.RolesMap.get(args.role) || 'unknown'}) was granted to ${args.account} by ${args.sender}`,
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: contractInfo.address,
        abi: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
        alertId: `ROLE-REVOKED`,
        name: `🚨 ${contractInfo.name}: Role revoked`,
        description: (args: Result) =>
          `Role ${args.role}(${DeploymentAddresses.RolesMap.get(args.role) || 'unknown'}) was revoked to ${args.account} by ${args.sender}`,
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      },
    ]
  })
}
