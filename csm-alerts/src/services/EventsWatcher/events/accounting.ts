import { FindingSeverity, FindingType, ethers } from '@fortanetwork/forta-bot'

import { CSAccounting__factory } from '../../../generated/typechain'
import { EventOfNotice } from '../../../shared/types'
import { etherscanAddress, formatEther } from '../../../utils/string'

const ICSAccounting = CSAccounting__factory.createInterface()

export function getCSAccountingEvents(accounting: string): EventOfNotice[] {
    return [
        {
            address: accounting,
            abi: ICSAccounting.getEvent('ChargePenaltyRecipientSet').format('full'),
            alertId: 'CS-ACCOUNTING-CHARGE-PENALTY-RECIPIENT-SET',
            name: '🚨 CSAccounting: Charge penalty recipient set',
            description: (args: ethers.Result) =>
                `Charge penalty recipient set to ${etherscanAddress(args.chargeRecipient)} (expecting the treasury)`,
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
        },
        {
            address: accounting,
            abi: ICSAccounting.getEvent('BondCurveUpdated').format('full'),
            alertId: 'CS-ACCOUNTING-BOND-CURVE-UPDATED',
            name: '🚨 CSAccounting: Bond curve updated',
            description: (args: ethers.Result) => {
                const bondCurveString = args.bondCurve
                    .map((value: bigint) => formatEther(value))
                    .join(', ')
                return `Bond curve #${args.curveId} updated. New values: [${bondCurveString}]`
            },
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
        },
        {
            address: accounting,
            abi: ICSAccounting.getEvent('BondCurveAdded').format('full'),
            alertId: 'CS-ACCOUNTING-BOND-CURVE-ADDED',
            name: '🔴 CSAccounting: Bond curve added',
            description: (args: ethers.Result) => {
                const bondCurveString = args.bondCurve
                    .map((value: bigint) => formatEther(value))
                    .join(', ')
                return `Bond curve added: [${bondCurveString}]`
            },
            severity: FindingSeverity.High,
            type: FindingType.Info,
        },
    ]
}
