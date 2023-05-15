import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-pools-balances e2e tests", () => {
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
        provideAgentPath("subagents/pools-balances/agent-pools-balances")
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
    "should process block with imbalanced Curve pool",
    async () => {
      const findings = await runBlock(16804419);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with Curve pool rapid imbalance change",
    async () => {
      const findings = await runBlock(16306452, 16300452);
      expect(
        findings
          .filter(
            (finding) => finding.alertId == "CURVE-POOL-IMBALANCE-RAPID-CHANGE"
          )
          .at(0)
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with significant Curve pool change",
    async () => {
      const findings = await runBlock(16870590, 16870589);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with imbalanced Balancer pool",
    async () => {
      const findings = await runBlock(16398269, 16347860);
      expect(
        findings
          .filter((finding) => finding.alertId == "BALANCER-POOL-IMBALANCE")
          .at(0)
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with significant Balancer pool change",
    async () => {
      const findings = await runBlock(17000731, 17000000);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with Balancer pool rapid imbalance change",
    async () => {
      const findings = await runBlock(16306450, 16306009);
      expect(
        findings
          .filter(
            (finding) =>
              finding.alertId == "BALANCER-POOL-IMBALANCE-RAPID-CHANGE"
          )
          .at(0)
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with low stETH PEG on Chainlink",
    async () => {
      const findings = await runBlock(15485829, 15485828);
      expect(
        findings
          .filter((finding) => finding.alertId == "LOW-STETH-CHAINLINK-PEG")
          .at(0)
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with decreased stETH PEG on Curve",
    async () => {
      const findings = await runBlock(16038267, 16037266);
      expect(
        findings
          .filter((finding) => finding.alertId == "STETH-CURVE-PEG-DECREASE")
          .at(0)
      ).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );
});
