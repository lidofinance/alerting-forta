import { EventOfNotice } from '../../entity/events'
import { ETH_DECIMALS, INSURANCE_FUND_ADDRESS, KNOWN_ERC20 } from '../constants'
import BigNumber from 'bignumber.js'
import { etherscanAddress } from '../tier'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

export const INSURANCE_FUND_EVENTS: EventOfNotice[] = [
  {
    address: INSURANCE_FUND_ADDRESS,
    event: 'event EtherTransferred(address indexed _recipient, uint256 _amount)',
    alertId: 'INS-FUND-ETH-TRANSFERRED',
    name: '⚠️ Insurance fund: ETH transferred',
    description: (args: Result) =>
      `${new BigNumber(String(args._amount))
        .div(ETH_DECIMALS)
        .toFixed(2)} ETH were transferred from insurance fund to ${etherscanAddress(args._recipient)}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: INSURANCE_FUND_ADDRESS,
    event: 'event ERC721Transferred(address indexed _token, address indexed _recipient, uint256 _tokenId, bytes _data)',
    alertId: 'INS-FUND-ERC721-TRANSFERRED',
    name: '⚠️ Insurance fund: ERC721 transferred',
    description: (args: Result) =>
      `ERC721 token (address: ${etherscanAddress(args._token)}, id: ${
        args._tokenId
      }) was transferred form insurance fund to ${etherscanAddress(args._recipient)}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: INSURANCE_FUND_ADDRESS,
    event: 'event ERC20Transferred(address indexed _token, address indexed _recipient, uint256 _amount)',
    alertId: 'INS-FUND-ERC20-TRANSFERRED',
    name: '🚨 Insurance fund: ERC20 transferred',
    description: (args: Result) => {
      const tokenInfo = KNOWN_ERC20.get(args._token.toLowerCase()) || {
        decimals: 18,
        name: 'unknown',
      }
      return `${new BigNumber(String(args._amount)).div(10 ** tokenInfo.decimals).toFixed(2)} of ${etherscanAddress(
        args._token,
      )}(${tokenInfo.name}) were transferred from insurance fund to ${etherscanAddress(args._recipient)}`
    },
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: INSURANCE_FUND_ADDRESS,
    event:
      'event ERC1155Transferred(address indexed _token, address indexed _recipient, uint256 _tokenId, uint256 _amount, bytes _data)',
    alertId: 'INS-FUND-ERC1155-TRANSFERRED',
    name: '⚠️ Insurance fund: ERC1155 transferred',
    description: (args: Result) =>
      `${args._amount} of ERC1155 token (address: ${etherscanAddress(args._token)}, id: ${
        args._tokenId
      }) was transferred form insurance fund to ${etherscanAddress(args._recipient)}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: INSURANCE_FUND_ADDRESS,
    event: 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
    alertId: 'INS-FUND-OWNERSHIP-TRANSFERRED',
    name: '🚨 Insurance fund: Ownership transferred',
    description: (args: Result) =>
      `Owner of the insurance fund was transferred from ${etherscanAddress(args.previousOwner)} to ${etherscanAddress(
        args.newOwner,
      )}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
]
