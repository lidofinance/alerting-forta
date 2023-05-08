import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-lido-report e2e tests", () => {
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
        provideAgentPath("subagents/lido-report/agent-lido-report")
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

  // todo: change after upgrade. Findings completely changed
  it(
    "should process tx with Lido Oracle report",
    async () => {
      const findings = await runTransaction(
        "0xe949652989ceed222ad1d1a903f7c925d64a7227b6a286451f9a454f753e9241"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with decreased Lido Beacon rewards",
    async () => {
      const findings = await runTransaction(
        "0x1a5eed94c2da9da1ab5d40b723f92c43ce8a06e00b0a369d15561618115ef199"
      );
      expect(findings.at(1)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );
});
