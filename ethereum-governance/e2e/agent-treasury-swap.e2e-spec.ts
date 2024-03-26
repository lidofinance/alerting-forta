import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 180_000; // ms

describe("treasury-swap e2e tests", () => {
  let runBlock: (
    blockHashOrNumber: string | number,
    initBlock?: number,
    skipInit?: boolean,
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
        provideAgentPath("subagents/treasury-swap/treasury-swap"),
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
    "should find 0 testflight stonks at creation block",
    async () => {
      let findings = await runBlock(19440190, 19440050);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
  it(
    "should find 1 testflight stonks at creation block",
    async () => {
      let findings = await runBlock(19440200, 19440050);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 testflight stonks at next after creation block",
    async () => {
      let findings = await runBlock(19440190, 19440070);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 1 testflight stonks at next after creation block",
    async () => {
      let findings = await runBlock(19440200, 19440070);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 stonks in 30+ after testflight",
    async () => {
      let findings = await runBlock(19440220, 19440210);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 in 31+ after testflight",
    async () => {
      let findings = await runBlock(19440680, 19440210);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 in 120+ after testflight",
    async () => {
      let findings = await runBlock(19440680, 19440660);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});