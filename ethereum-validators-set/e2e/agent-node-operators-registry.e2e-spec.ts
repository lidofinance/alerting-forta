import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
  removeTimestamp,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-node-operators-registry e2e tests", () => {
  let runBlock: (blockHashOrNumber: string | number) => Promise<Finding[]>;
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
    "should process tx with removed signing keys",
    async () => {
      const findings = await runTransaction(
        "0xd9d9419ffd13c4a4e67534de704952cf53e515711be9fe36cec2e57ed7248ddd",
      );
      expect(removeTimestamp(findings)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with set NO target limit set and added Node operator",
    async () => {
      const findings = await runTransaction(
        "0xcd406d8439cf7b635ede687ea4fbe6d3e3a7d33e1a16c78ca5ba304ac06cb415",
      );
      expect(removeTimestamp(findings)).toMatchSnapshot();
    },
    TEST_TIMEOUT * 2,
  );
});
