/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['dist'],
  moduleNameMapper: {
    'constants/common': '<rootDir>/src/shared/constants/common/mainnet',
    'constants/acl-changes': '<rootDir>/src/shared/constants/acl-changes/mainnet',
  },
}