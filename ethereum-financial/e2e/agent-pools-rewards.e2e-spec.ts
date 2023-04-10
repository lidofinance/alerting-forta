import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-pools-rewards e2e tests", () => {
  let runBlock: (
    blockHashOrNumber: string | number,
    initBlock?: number
  ) => Promise<Finding[]>;
  let runTransaction: (txHash: string) => Promise<Finding[]>;
  let logSpy: jest.SpyInstance;

  beforeAll(() => {
    logSpy = jest.spyOn(console, "log");
    logSpy.mockImplementation(() => {});
  });

  beforeEach(async () => {
    const container = configureContainer() as AwilixContainer;
    container.register({
      agentPath: asFunction(
        provideAgentPath("subagents/pools-rewards/agent-pools-rewards")
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
    "should process block with prolonged rewards",
    async () => {
      const findings = await runBlock(14362903, 14362800);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with rewards period expiration",
    async () => {
      const findings = await runBlock(14349934, 14349800);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );
});
