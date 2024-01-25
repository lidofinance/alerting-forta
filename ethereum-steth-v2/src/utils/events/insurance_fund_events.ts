import { EventOfNotice } from '../../entity/events'
import { Address, ERC20, ETH_DECIMALS } from '../constants'
import BigNumber from 'bignumber.js'
import { FindingSeverity, FindingType, LogDescription } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { faker } from '@faker-js/faker'
import { createLogDescriptionMock } from '../contract_mocks/log_description.mock'

export function getInsuranceFundEvents(
  INSURANCE_FUND_ADDRESS: string,
  KNOWN_ERC20: Map<string, ERC20>,
): EventOfNotice[] {
  return [
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
      event:
        'event ERC721Transferred(address indexed _token, address indexed _recipient, uint256 _tokenId, bytes _data)',
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
}

export function getFilteredInsuranceFundEventsMock(): LogDescription[] {
  const descriptions = [
    {
      ['_amount']: Address.DAI_ADDRESS,
      ['_recipient']: faker.finance.ethereumAddress(),
    },
    {
      ['_token']: Address.DAI_ADDRESS,
      ['_recipient']: faker.finance.ethereumAddress(),
    },
    {
      ['_token']: Address.DAI_ADDRESS,
      ['_amount']: faker.number.bigInt(),
      ['_recipient']: faker.finance.ethereumAddress(),
    },
    {
      ['_token']: Address.DAI_ADDRESS,
      ['_amount']: faker.number.bigInt(),
      ['_recipient']: faker.finance.ethereumAddress(),
    },
    {
      ['previousOwner']: faker.finance.ethereumAddress(),
      ['newOwner']: faker.finance.ethereumAddress(),
    },
  ]

  const out: LogDescription[] = []
  for (const desc of descriptions) {
    // eslint-disable-next-line
    // @ts-expect-error
    out.push(createLogDescriptionMock(desc))
  }

  return out
}
