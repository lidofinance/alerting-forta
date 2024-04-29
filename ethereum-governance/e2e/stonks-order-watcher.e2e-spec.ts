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

const orders = [
  {
    block: 19731125,
    blockRound: 19731125 + BLOCK_WINDOW - (19731125 % BLOCK_WINDOW),
    address: "0x855ac802409d632db4452ef008b8ec1cc34c4d6e",
    desc: "stETH -> USDC",
  },
  {
    block: 19730974,
    blockRound: 19730974 + BLOCK_WINDOW - (19730974 % BLOCK_WINDOW),
    address: "0x35136b2d2426ecd2e86b7dbc48d6c41c52f49ade",
    desc: "stETH -> DAI",
  },
];

describe.each(orders)(
  "treasury-swap e2e tests",
  ({ block, blockRound, address, desc }) => {
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
          provideAgentPath(
            "subagents/stonks-order-watcher/stonks-order-watcher",
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

    const prepareFindings = (findings: Finding[], address: string) => {
      const result = findings.filter((finding) =>
        `${finding.description}`
          .toLowerCase()
          .includes(`${address}`.toLowerCase()),
      );
      result.sort((a, b) => (a.description < b.description ? -1 : 1));
      return result;
    };

    it(
      `should find 0 order (${desc}) before init (block ${block})`,
      async () => {
        let findings = await runBlock(
          blockRound - BLOCK_WINDOW,
          block - BLOCK_WINDOW,
        );
        expect(prepareFindings(findings, address)).toMatchSnapshot();
      },
      TEST_TIMEOUT,
    );
    it(
      `should find 1 order (${desc}) after init (block ${block})`,
      async () => {
        let findings = await runBlock(blockRound + 150, block);
        expect(prepareFindings(findings, address)).toMatchSnapshot();
      },
      TEST_TIMEOUT,
    );

    it(
      `should find 1 order (${desc}) after re-init (block ${block})`,
      async () => {
        let findings = await runBlock(blockRound + 150, block + BLOCK_WINDOW);
        expect(prepareFindings(findings, address)).toMatchSnapshot();
      },
      TEST_TIMEOUT,
    );

    it(
      `should find 0 order (${desc}) near 30m after (block ${block})`,
      async () => {
        let findings = await runBlock(blockRound + 170, block + 160);
        expect(prepareFindings(findings, address)).toMatchSnapshot();
      },
      TEST_TIMEOUT,
    );

    it(
      `should find 0 order (${desc}) between 31-120m after (block ${block})`,
      async () => {
        let findings = await runBlock(blockRound + 630, block + 160);
        expect(prepareFindings(findings, address)).toMatchSnapshot();
      },
      TEST_TIMEOUT,
    );

    it(
      `should find 0 order (${desc}) near 120m after (block ${block})`,
      async () => {
        let findings = await runBlock(blockRound + 630, block + 610);
        expect(prepareFindings(findings, address)).toMatchSnapshot();
      },
      TEST_TIMEOUT,
    );
  },
);
