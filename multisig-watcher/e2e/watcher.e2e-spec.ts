import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("multisig-watcher e2e tests", () => {
  let runBlock: (blockHashOrNumber: string | number) => Promise<Finding[]>;
  let runTransaction: (
    txHash: string,
    initBlock?: number,
  ) => Promise<Finding[]>;
  let logSpy: jest.SpyInstance;
  let timeSpy: jest.SpyInstance;

  beforeAll(() => {
    logSpy = jest.spyOn(console, "log");
    logSpy.mockImplementation(() => {});
    timeSpy = jest.spyOn(Date, "now");
    timeSpy.mockImplementation(() => new Date("2023-12-31"));
  });

  beforeEach(async () => {
    const container = configureContainer() as AwilixContainer;
    container.register({
      agentPath: asFunction(
        provideAgentPath(
          "agent",
        ),
      ),
      runTransaction: asFunction(provideRunTransaction),
      runBlock: asFunction(provideRunBlock),
    });

    // https://docs.forta.network/en/latest/cli/#invoke-commands-programmatically
    runTransaction = container.resolve("runTransaction");
    runBlock = container.resolve("runBlock");
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it(
    "should process tx with Added Owner and Execution Success",
    async () => {
      const findings = await runTransaction(
        "0x4c3e507fd78daac24dd75e33e7c69381481db8bce62c795d2eec67126ad6d396",
      );
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
  it(
    "should process tx with Changed Threshold and Execution Success",
    async () => {
      const findings = await runTransaction(
        "0xb58e9e81ad1dac1f33b9dfc4d19f2d909a2a3ea890c31aa27a0df10f86bd4eea",
      );
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
