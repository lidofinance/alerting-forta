import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-node-operators-registry e2e tests", () => {
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
          "subagents/node-operators-registry/agent-node-operators-registry",
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
    "should process tx with added simple dvt clusters",
    async () => {
      const findings = await runTransaction(
        "0xc3338fc9ef0419109b90dcc318ac89bcdb235a1fe7b9960611a7d0666c1e8170",
        20719100,
      );
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
