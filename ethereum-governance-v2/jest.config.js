/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['dist'],
  moduleNameMapper: {
    'constants/common': '<rootDir>/src/shared/constants/common/mainnet',
    'constants/ens-names': '<rootDir>/src/shared/constants/ens-names/mainnet',
    'constants/easy-track': '<rootDir>/src/shared/constants/easy-track/mainnet',
    'constants/proxy-watcher': '<rootDir>/src/shared/constants/proxy-watcher/mainnet',
    'constants/acl-changes': '<rootDir>/src/shared/constants/acl-changes/mainnet',
    'constants/aragon-voting': '<rootDir>/src/shared/constants/aragon-voting/mainnet',
    'constants/trp-changes': '<rootDir>/src/shared/constants/trp-changes/mainnet',
    'constants/stonks': '<rootDir>/src/shared/constants/stonks/mainnet',
  },
}
