import { LogDescription } from 'forta-agent'
import { faker } from '@faker-js/faker'
import { Result } from '@ethersproject/abi/lib'

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
