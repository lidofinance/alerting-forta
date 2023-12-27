import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
  removeTimestamp,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-aragon-voting e2e tests", () => {
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
        provideAgentPath("subagents/aragon-voting/agent-aragon-voting"),
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
    "should process tx with started vote",
    async () => {
      const findings = await runTransaction(
        "0xb6f8116321f3cb3d63f9727af0e24fba0f7088f228adb640ef91a51924faa42f",
      );
      expect(removeTimestamp(findings).at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with executed vote",
    async () => {
      const findings = await runTransaction(
        "0xcd406d8439cf7b635ede687ea4fbe6d3e3a7d33e1a16c78ca5ba304ac06cb415",
      );
      expect(removeTimestamp(findings).at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process block with changed outcome",
    async () => {
      const findings = await runBlock(18285394, 18285393);
      expect(removeTimestamp(findings).at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
