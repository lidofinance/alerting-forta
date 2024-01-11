import { EventOfNotice } from '../../entity/events'
import { etherscanAddress } from '../tier'
import { FindingSeverity, FindingType } from 'forta-agent'
import { BURNER_ADDRESS } from '../constants'
import { Result } from '@ethersproject/abi/lib'

export const BURNER_EVENTS: EventOfNotice[] = [
  {
    address: BURNER_ADDRESS,
    event: 'event ERC20Recovered(address indexed requestedBy, address indexed token,uint256 amount)',
    alertId: 'LIDO-BURNER-ERC20-RECOVERED',
    name: 'ℹ️ Lido Burner: ERC20 recovered',
    description: (args: Result) =>
      `ERC20 recovered:\n` +
      `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: BURNER_ADDRESS,
    event: 'event ERC721Recovered(address indexed requestedBy, address indexed token, uint256 tokenId)',
    alertId: 'LIDO-BURNE-ERC721-RECOVERED',
    name: 'ℹ️ Lido Burner: ERC721 recovered',
    description: (args: Result) =>
      `ERC721 recovered:\n` +
      `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
]
