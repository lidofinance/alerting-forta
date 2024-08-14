import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress, toEthString } from '../string'
import { Finding } from '../../generated/proto/alert_pb'
import BigNumber from 'bignumber.js'

export const APPROVAL_EVENT = 'event Approval(address indexed owner, address indexed spender, uint256 value)'

export function getCSAccountingEvents(CS_ACCOUNTING_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: CS_ACCOUNTING_ADDRESS,
      abi: 'event ChargePenaltyRecipientSet(address chargeRecipient)',
      alertId: 'CS-ACCOUNTING-CHARGE-PENALTY-RECIPIENT-SET',
      name: '🚨 CSAccounting: Charge penalty recipient set',
      description: (args: Result) =>
        `Charge penalty recipient set to ${etherscanAddress(args.chargeRecipient)} (expecting the treasury)`,
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_ACCOUNTING_ADDRESS,
      abi: 'event BondCurveUpdated(uint256 indexed curveId, uint256[] bondCurve)',
      alertId: 'CS-ACCOUNTING-BOND-CURVE-UPDATED',
      name: '🚨 CSAccounting: Bond curve updated',
      description: (args: Result) => {
        const bondCurveString = args.bondCurve.map((value: string) => toEthString(BigNumber(Number(value)))).join(', ')
        return `Bond curve updated with curve ID ${args.curveId}. Bond curve: [${bondCurveString}]`
      },
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_ACCOUNTING_ADDRESS,
      abi: 'event BondCurveAdded(uint256[] bondCurve)',
      alertId: 'CS-ACCOUNTING-BOND-CURVE-ADDED',
      name: '🔴 CSAccounting: Bond curve added',
      description: (args: Result) => {
        const bondCurveString = args.bondCurve.map((value: string) => toEthString(BigNumber(Number(value)))).join(', ')
        return `Bond curve added: [${bondCurveString}]`
      },
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_ACCOUNTING_ADDRESS,
      abi: 'event BondCurveSet(uint256 indexed nodeOperatorId, uint256 curveId)',
      alertId: 'CS-ACCOUNTING-BOND-CURVE-SET',
      name: '🔴 CSAccounting: Bond curve set',
      description: (args: Result) =>
        `Bond curve set for node operator ID ${args.nodeOperatorId} with curve ID ${args.curveId}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
