import { Result } from '@ethersproject/abi'
import { LogDescription } from 'forta-agent'
import { faker } from '@faker-js/faker'
import { Address } from '../../constants'

export function createLogDescriptionMock(args?: Result): jest.Mocked<LogDescription> {
  return {
    address: faker.finance.ethereumAddress(),
    // eslint-disable-next-line
    // @ts-expect-error
    args: args ?? {},
    // eslint-disable-next-line
    // @ts-expect-error
    eventFragment: jest.fn(),
    logIndex: faker.number.int(),
    name: faker.string.uuid(),
    signature: faker.finance.ethereumAddress(),
    topic: faker.finance.ethereumAddress(),
  }
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

export function getFilteredDepositSecurityEventsMock(): LogDescription[] {
  const descriptions = [
    {
      ['guardian']: faker.finance.ethereumAddress(),
      ['stakingModuleId']: 1,
    },
    { ['stakingModuleId']: 1 },
    { ['guardian']: faker.finance.ethereumAddress() },
    { ['newValue']: faker.number.int() },
    { ['newValue']: faker.number.int() },
    { ['newValue']: faker.number.int() },
    { ['newValue']: faker.number.int() },
    { ['newValue']: faker.number.int() },
  ]

  const out: LogDescription[] = []
  for (const desc of descriptions) {
    // eslint-disable-next-line
    // @ts-expect-error
    out.push(createLogDescriptionMock(desc))
  }

  return out
}

export function getFilteredInsuranceFundEventsMock(): LogDescription[] {
  const descriptions = [
    {
      ['_token']: Address.DAI_ADDRESS,
      ['_recipient']: faker.finance.ethereumAddress(),
      ['_amount']: faker.number.bigInt(),
    },
    {
      ['previousOwner']: faker.finance.ethereumAddress(),
      ['newOwner']: faker.finance.ethereumAddress(),
    },
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
  ]

  const out: LogDescription[] = []
  for (const desc of descriptions) {
    // eslint-disable-next-line
    // @ts-expect-error
    out.push(createLogDescriptionMock(desc))
  }

  return out
}

export function getFilteredLidoEventsMock(): LogDescription[] {
  const descriptions = [
    {},
    {},
    {},
    {},
    {
      ['maxStakeLimit']: faker.number.int(),
      ['stakeLimitIncreasePerBlock']: faker.number.int(),
    },
    {},
    {
      ['lidoLocator']: faker.finance.ethereumAddress(),
    },
    {
      ['vault']: faker.finance.ethereumAddress(),
      ['token']: faker.finance.ethereumAddress(),
    },
    {
      ['version']: faker.system.semver(),
    },
    {
      ['amount']: faker.number.int(),
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

export function getFilteredWithdrawalsEventsMock(): LogDescription[] {
  const descriptions = [
    {},
    {
      ['duration']: faker.number.int(),
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
