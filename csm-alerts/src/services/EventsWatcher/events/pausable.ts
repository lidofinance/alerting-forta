import { FindingSeverity, FindingType } from '@fortanetwork/forta-bot'

import { PausableUntil__factory } from '../../../generated/typechain'
import * as PausableUntil from '../../../generated/typechain/PausableUntil'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress, toKebabCase } from '../../../utils/string'
import { formatDelay } from '../../../utils/time'

const IPausableUntil = PausableUntil__factory.createInterface()

export function getPausableEvents(contracts: { name: string; address: string }[]): EventOfNotice[] {
    return contracts.flatMap((contract) => {
        return [
            {
                address: contract.address,
                abi: IPausableUntil.getEvent('Paused').format('full'),
                alertId: `${toKebabCase(contract.name)}-PAUSED`,
                name: `🚨 ${contract.name}: contract was paused`,
                description: (args: PausableUntil.PausedEvent.OutputObject) =>
                    `Contract ${etherscanAddress(contract.address)} paused for ${formatDelay(args.duration)}`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IPausableUntil.getEvent('Resumed').format('full'),
                alertId: `${toKebabCase(contract.name)}-RESUMED`,
                name: `🚨 ${contract.name}: contract was resumed`,
                description: () => `Contract ${etherscanAddress(contract.address)} was resumed`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
        ]
    })
}
