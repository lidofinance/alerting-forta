/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['dist'],
  moduleNameMapper: {
    'constants/common': '<rootDir>/src/utils/constants/common/mainnet',
    'constants/ens-names': '<rootDir>/src/utils/constants/ens-names/mainnet',
    'constants/easy-track': '<rootDir>/src/utils/constants/easy-track/mainnet',
    'constants/proxy-watcher': '<rootDir>/src/utils/constants/proxy-watcher/mainnet',
    'constants/acl-changes': '<rootDir>/src/utils/constants/acl-changes/mainnet',
    'constants/aragon-voting': '<rootDir>/src/utils/constants/aragon-voting/mainnet',
    'constants/trp-changes': '<rootDir>/src/utils/constants/trp-changes/mainnet',
  },
}
