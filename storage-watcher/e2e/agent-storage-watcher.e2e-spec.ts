import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
  removeTimestamp,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-storage-watcher e2e tests", () => {
  let runBlock: (
    blockHashOrNumber: string | number,
    initBlock?: number,
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
        provideAgentPath("subagents/storage-watcher/agent-storage-watcher"),
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
    "should process block with critical storage slot value changed",
    async () => {
      const findings = await runBlock(18229364, 18229363);
      expect(removeTimestamp(findings)).toMatchSnapshot();
    },
    TEST_TIMEOUT * 2,
  );
});
