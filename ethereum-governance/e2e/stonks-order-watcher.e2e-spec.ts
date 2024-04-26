import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 180_000; // ms

/**
 * Tests works for testflight stonks 0x5FA801ee2202b3Bcd2317F9a65A408A725746647
 */

describe.skip("treasury-swap e2e tests", () => {
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
        provideAgentPath("subagents/stonks-order-watcher/stonks-order-watcher"),
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

  // for block and order
  // https://etherscan.io/block/19440050 -> https://etherscan.io/block/19730974
  // https://etherscan.io/address/0x0d4d93c171452d8c58e7a8cc2d70045ebf3d293c -> https://etherscan.io/address/0x35136b2d2426ecd2e86b7dbc48d6c41c52f49ade

  const orderBlock = 19440050

  it(
    "should find 0 testflight stonks at creation block",
    async () => {
      let findings = await runBlock(orderBlock+140, orderBlock);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
  it(
    "should find 1 testflight stonks at creation block",
    async () => {
      let findings = await runBlock(orderBlock+150, orderBlock);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 testflight stonks at next after creation block",
    async () => {
      let findings = await runBlock(orderBlock+140, orderBlock+20);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 1 testflight stonks at next after creation block",
    async () => {
      let findings = await runBlock(orderBlock+150, orderBlock+20);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 stonks in 30+ after testflight",
    async () => {
      let findings = await runBlock(orderBlock+170, orderBlock+160);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 in 31+ after testflight",
    async () => {
      let findings = await runBlock(orderBlock+630, orderBlock+160);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 in 120+ after testflight",
    async () => {
      let findings = await runBlock(orderBlock+630, orderBlock+610);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
