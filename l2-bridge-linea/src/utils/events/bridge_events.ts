import { FindingSeverity, FindingType } from 'forta-agent'
import { LINEA_L2_ERC20_TOKEN_BRIDGE } from '../constants'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'

export const L2_BRIDGE_EVENTS: EventOfNotice[] = [
  {
    address: LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
    event: 'event Paused(address account)',
    alertId: 'L2-BRIDGE-PAUSED',
    name: '🚨 Linea L2 Bridge: Paused',
    description: (args: Result) => LINEA_L2_ERC20_TOKEN_BRIDGE.name + ` is paused by ${args.account}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
    event: 'event Unpaused(address account)',
    alertId: 'L2-BRIDGE-UNPAUSED',
    name: '⚠️ Linea L2 Bridge: UNPAUSED',
    description: (args: Result) => LINEA_L2_ERC20_TOKEN_BRIDGE.name + ` is unpaused by ${args.account}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
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
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
]
