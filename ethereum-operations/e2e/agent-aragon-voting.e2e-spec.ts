import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-aragon-voting e2e tests", () => {
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
        provideAgentPath("subagents/aragon-voting/agent-aragon-voting")
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
        "0x69987bf8c4352c40e0429c8492d4842011071524171cd382ea7327d808b37858"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with executed vote",
    async () => {
      const findings = await runTransaction(
        "0x4cc1911b3016ceec169db5b73714b02ee155fb03b6e018fc66a1063a9c1e15fa"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with changed outcome",
    async () => {
      const findings = await runBlock(16691599, 16691598);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );
});
