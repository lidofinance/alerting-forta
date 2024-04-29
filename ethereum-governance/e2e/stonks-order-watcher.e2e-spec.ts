import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import { BLOCK_WINDOW } from "../src/subagents/stonks-order-watcher/constants";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 180_000; // ms

/**
 * Tests works for stETH -> DAI
 */

const hasAddressInDescription = (finding: Finding, address: string) => {
  return `${finding.description}`
    .toLowerCase()
    .includes(`${address}`.toLowerCase());
};

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
  // https://etherscan.io/block/19730974
  // https://etherscan.io/address/0x35136b2d2426ecd2e86b7dbc48d6c41c52f49ade

  const orderBlock = 19730974;
  const orderBlockRound = 19730974 + 6;
  const orderAddress = "0x35136b2d2426ecd2e86b7dbc48d6c41c52f49ade";

  it(
    "should find 0 stETH2DAI stonks at creation block",
    async () => {
      let findings = await runBlock(
        orderBlockRound - BLOCK_WINDOW,
        orderBlock - BLOCK_WINDOW,
      );
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(
        findings.filter((fi) => hasAddressInDescription(fi, orderAddress)),
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
  it(
    "should find 1 stETH2DAI stonks at creation block",
    async () => {
      let findings = await runBlock(orderBlockRound + 150, orderBlock);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(
        findings.filter((fi) => hasAddressInDescription(fi, orderAddress)),
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 1 stETH2DAI stonks at next after creation block",
    async () => {
      let findings = await runBlock(orderBlockRound + 150, orderBlock + 20);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(
        findings.filter((fi) => hasAddressInDescription(fi, orderAddress)),
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 stonks near 30m after stETH2DAI",
    async () => {
      let findings = await runBlock(orderBlockRound + 170, orderBlock + 160);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(
        findings.filter((fi) => hasAddressInDescription(fi, orderAddress)),
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 between 31-120m after stETH2DAI",
    async () => {
      let findings = await runBlock(orderBlockRound + 630, orderBlock + 160);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(
        findings.filter((fi) => hasAddressInDescription(fi, orderAddress)),
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should find 0 near 120m after stETH2DAI",
    async () => {
      let findings = await runBlock(orderBlockRound + 630, orderBlock + 610);
      findings.sort((a, b) => (a.description < b.description ? -1 : 1));
      expect(
        findings.filter((fi) => hasAddressInDescription(fi, orderAddress)),
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
