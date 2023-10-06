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
        "0x43529ea1c44b6f6134fa045f6af81a1a15be6309a32424ea742fa056977c4010",
      );
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with set NO target limit set",
    async () => {
      const findings = await runTransaction(
        "0xcd406d8439cf7b635ede687ea4fbe6d3e3a7d33e1a16c78ca5ba304ac06cb415",
      );
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with added Node operator",
    async () => {
      const findings = await runTransaction(
        "0xa4629245311d93a11cedb9143d8b7530057685b4b568a026bac194e162002c13",
      );
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
