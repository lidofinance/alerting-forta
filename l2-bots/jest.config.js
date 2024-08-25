/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['dist'],
  globalSetup: "./test/jest.setup.ts",
  globalTeardown: "./test/jest.teardown.ts",
}
