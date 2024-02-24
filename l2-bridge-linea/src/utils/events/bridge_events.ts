import { FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { ProxyContract } from '../constants'

export function getL2BridgeEvents(LINEA_L2_ERC20_TOKEN_BRIDGE: ProxyContract): EventOfNotice[] {
  const uniqueKeys = [
    `c244ac52-c023-48a0-a37a-63cd454a4b93`,
    `6d54ab23-f11b-4857-a62d-9075a20739d5`,
    `c76f9a57-ac14-4d9e-9906-092c3595c2d1`,
  ]

  return [
    {
      address: LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
      event: 'event Paused(address account)',
      alertId: 'L2-BRIDGE-PAUSED',
      name: '🚨 Linea L2 Bridge: Paused',
      description: (args: Result) => LINEA_L2_ERC20_TOKEN_BRIDGE.name + ` is paused by ${args.account}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
      event: 'event Initialized(uint8 version)',
      alertId: 'L2-BRIDGE-IMPLEMENTATION-INITIALIZED',
      name: '🚨 Linea L2 Bridge: Implementation initialized',
      description: (args: Result) =>
        `Implementation of the Linea L2 Bridge was initialized by version: ${args.version}\n` +
        `NOTE: This is not the thing that should be left unacted! ` +
        `Make sure that this call was made by Lido!`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
      event: 'event Unpaused(address account)',
      alertId: 'L2-BRIDGE-UNPAUSED',
      name: '⚠️ Linea L2 Bridge: UNPAUSED',
      description: (args: Result) => LINEA_L2_ERC20_TOKEN_BRIDGE.name + ` is unpaused by ${args.account}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
  ]
}
