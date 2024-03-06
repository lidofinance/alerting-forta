import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi'
import { ARAGON_VOTING_ADDRESS } from 'constants/aragon-voting'
import { etherscanAddress } from '../string'

export const CAST_VOTE_EVENT =
  'event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake)'

export const ARAGON_VOTING_EVENTS_OF_NOTICE = [
  {
    address: ARAGON_VOTING_ADDRESS,
    event: 'event StartVote(uint256 indexed voteId, address indexed creator, string metadata)',
    alertId: 'ARAGON-VOTE-STARTED',
    name: '🚀 Aragon: Vote started',
    description: (args: Result) => `Aragon vote ${args.voteId} was started by ` + `${etherscanAddress(args.creator)}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: ARAGON_VOTING_ADDRESS,
    event: 'event ExecuteVote(uint256 indexed voteId)',
    alertId: 'ARAGON-VOTE-EXECUTED',
    name: '✅ Aragon: Vote executed',
    description: (args: Result) => `Aragon vote ${args.voteId} was executed`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
]
