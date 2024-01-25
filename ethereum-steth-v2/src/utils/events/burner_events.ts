import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType, LogDescription } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { faker } from '@faker-js/faker'
import { createLogDescriptionMock } from '../contract_mocks/log_description.mock'

export function getBurnerEvents(BURNER_ADDRESS: string): EventOfNotice[] {
  return [
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
      alertId: 'LIDO-BURNER-ERC721-RECOVERED',
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
}

export function getFilteredBurnerEventsMock(): LogDescription[] {
  const descriptions = [
    {
      ['requestedBy']: faker.finance.ethereumAddress(),
      ['token']: faker.finance.ethereumAddress(),
      ['amount']: faker.number.int(),
    },
    {
      ['requestedBy']: faker.finance.ethereumAddress(),
      ['token']: faker.finance.ethereumAddress(),
      ['tokenId']: faker.number.int(),
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
