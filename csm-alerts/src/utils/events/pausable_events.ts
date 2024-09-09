import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { toKebabCase } from '../string'
import { ONE_HOUR } from '../constants'

interface PausableContract {
  name: string
  address: string
  functions: Map<string, string>
}

export function getPausableEvents(PAUSABLE_CONTRACTS: PausableContract[]): EventOfNotice[] {
  return PAUSABLE_CONTRACTS.flatMap((pausableContractInfo: PausableContract) => {
    return [
      {
        address: pausableContractInfo.address,
        abi: 'event Paused(uint256 duration)',
        alertId: `${toKebabCase(pausableContractInfo.name)}-PAUSED`,
        name: `🚨 ${pausableContractInfo.name}: contract was paused`,
        description: (args: Result) => `For ${args.duration / ONE_HOUR} hours`,
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: pausableContractInfo.address,
        abi: 'event Resumed()',
        alertId: `${toKebabCase(pausableContractInfo.name)}-UNPAUSED`,
        name: `🚨 ${pausableContractInfo.name}: contract was resumed`,
        description: () => 'Contract was resumed',
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      },
    ]
  })
}
