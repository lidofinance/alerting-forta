import { FindingSeverity, FindingType } from '@fortanetwork/forta-bot'

import { OssifiableProxy__factory } from '../../../generated/typechain'
import * as OssifiableProxy from '../../../generated/typechain/OssifiableProxy'
import { EventOfNotice } from '../../../shared/types'
import { addressOnExplorer } from '../../../utils/string'

const IOssifiableProxy = OssifiableProxy__factory.createInterface()

export function getOssifiedProxyEvents(
    contracts: { address: string; name: string }[],
): EventOfNotice[] {
    return contracts.flatMap((contract) => {
        return [
            {
                address: contract.address,
                abi: IOssifiableProxy.getEvent('ProxyOssified').format('full'),
                alertId: 'PROXY-OSSIFIED',
                name: `🚨 ${contract.name}: Proxy Ossified`,
                description: () =>
                    `Proxy for ${contract.name}(${addressOnExplorer(contract.address)}) was ossified`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IOssifiableProxy.getEvent('Upgraded').format('full'),
                alertId: 'PROXY-UPGRADED',
                name: `🚨 ${contract.name}: Implementation Upgraded`,
                description: (args: OssifiableProxy.UpgradedEvent.OutputObject) =>
                    `The proxy implementation has been upgraded to ${args.implementation}`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
            {
                address: contract.address,
                abi: IOssifiableProxy.getEvent('AdminChanged').format('full'),
                alertId: 'PROXY-ADMIN-CHANGED',
                name: `🚨 ${contract.name}: Admin Changed`,
                description: (args: OssifiableProxy.AdminChangedEvent.OutputObject) =>
                    `The proxy admin for ${contract.name}(${contract.address}) has been changed from ${addressOnExplorer(args.previousAdmin)} to ${addressOnExplorer(args.newAdmin)}`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
            },
        ]
    })
}
