import { FindingSeverity, FindingType } from 'forta-agent'
import BigNumber from 'bignumber.js'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../entity/events'

export const WITHDRAWALS_BUNKER_MODE_ENABLED_EVENT = 'event BunkerModeEnabled(uint256 _sinceTimestamp)'

export const WITHDRAWALS_BUNKER_MODE_DISABLED_EVENT = 'event BunkerModeDisabled()'

export const WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED_EVENT =
  'event WithdrawalRequested(uint256 indexed requestId, address indexed requestor, address indexed owner, uint256 amountOfStETH, uint256 amountOfShares)'

export const LIDO_TOKEN_REBASED_EVENT =
  'event TokenRebased(uint256 indexed reportTimestamp, uint256 timeElapsed, uint256 preTotalShares, uint256 preTotalEther, uint256 postTotalShares, uint256 postTotalEther, uint256 sharesMintedAsFees)'

export const WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT =
  'event WithdrawalsFinalized(uint256 indexed from, uint256 indexed to, uint256 amountOfETHLocked, uint256 sharesToBurn, uint256 timestamp)'

export const WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT =
  'event WithdrawalClaimed(uint256 indexed requestId, address indexed owner, address indexed receiver, uint256 amountOfETH)'

export function getWithdrawalsEvents(WITHDRAWAL_QUEUE_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: WITHDRAWAL_QUEUE_ADDRESS,
      event: 'event Paused(uint256 duration)',
      alertId: 'WITHDRAWALS-PAUSED',
      name: '🚨 Withdrawals: contract was paused',
      description: (args: Result) => `For ${new BigNumber(args.duration).div(60 * 60)} hours`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: WITHDRAWAL_QUEUE_ADDRESS,
      event: 'event Resumed()',
      alertId: 'WITHDRAWALS-UNPAUSED',
      name: '⚠️ Withdrawals: contract was unpaused',
      description: () => 'Contract was resumed',
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    },
  ]
}
