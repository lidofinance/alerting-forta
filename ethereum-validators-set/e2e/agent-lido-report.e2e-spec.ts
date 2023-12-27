import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
  removeTimestamp,
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
        provideAgentPath("subagents/lido-report/agent-lido-report"),
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
    "should process tx with Lido Oracle report",
    async () => {
      const findings = await runTransaction(
        "0xc786c3a7736d63da45447eb5082351d03633febe904ba5401ab59da1e89bd6ee",
      );
      expect(removeTimestamp(findings).at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with decreased Lido Beacon rewards",
    async () => {
      // todo: should be uncommented after v2 and at lest 1 decrease case since v2
      // const findings = await runTransaction(
      //   "0xc88d1cb05e76f92fc0c57fe41a13b7e8cf8b010e08a535b6f789023c001ccd4d "
      // );
      // expect(removeTimestamp(findings).at(1)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with Lido rebase digest",
    async () => {
      const findings = await runTransaction(
        "0xbf52777e4dd583d52104be96f7da420be977faeee97cc25a89d6c81fa919056f",
      );
      expect(removeTimestamp(findings).at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
