import { FindingSeverity, FindingType } from '@fortanetwork/forta-bot'

import { GateSeal__factory } from '../../../generated/typechain'
import * as GateSeal from '../../../generated/typechain/GateSeal'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress } from '../../../utils/string'
import { formatDelay } from '../../../utils/time'

const IGateSeal = GateSeal__factory.createInterface()

export function getGateSealEvents(
    address: string,
    knownContracts: { [key: string]: string },
): EventOfNotice[] {
    return [
        {
            address: address,
            abi: IGateSeal.getEvent('Sealed').format('full'),
            alertId: 'CS-GATE-SEAL-SEALED',
            name: '🚨 CSM Gate Seal paused a contract',
            description: (args: GateSeal.SealedEvent.OutputObject) =>
                `${etherscanAddress(args.sealable)} (${knownContracts[args.sealable] ?? 'unknown'})` +
                `was paused for ${formatDelay(args.sealed_for)} by ${etherscanAddress(args.sealed_by)}`,
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
        },
    ]
}
