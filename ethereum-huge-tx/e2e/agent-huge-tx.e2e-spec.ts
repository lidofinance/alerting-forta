import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-huge-tx e2e tests", () => {
  let runBlock: (
    blockHashOrNumber: string | number,
    initBlock?: number,
  ) => Promise<Finding[]>;
  let runTransaction: (txHash: string) => Promise<Finding[]>;
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
        provideAgentPath("subagents/huge-tx/agent-huge-tx"),
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
    "should process block with huge change in Maker wstETH-B vault balance",
    async () => {
      const findings = await runBlock(15250794, 15250719);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with huge token(s) transfer of Lido interest in a single TX",
    async () => {
      const findings = await runTransaction(
        "0x535d3848e0fd0715a455900d38816f57e7513663af24d7db0b1f6423cddc7821",
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
