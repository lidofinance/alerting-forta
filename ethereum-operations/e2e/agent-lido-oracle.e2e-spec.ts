import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-lido-oracle e2e tests", () => {
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
        provideAgentPath("subagents/lido-oracle/agent-lido-oracle")
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
    "should process block with Lido Oracle report overdue",
    async () => {
      const findings = await runBlock(15953817);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with low balance of Lido Oracle",
    async () => {
      const findings = await runBlock(16191626);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

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

  it(
    "should process tx with super sloppy Lido Oracle",
    async () => {
      const findings = await runTransaction(
        "0xc77f7ba9780b2bff72f8bd7cfe16043342644bec7fec42561785a2aac0729cf2"
      );
      expect(findings.at(1)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed allowed Beacon Balance Annual Relative Increase",
    async () => {
      const findings = await runTransaction(
        "0xf3b49e6ebf2db6ae64fb96f1ea03e32233fd0cb7219f9256907496fc76028e39"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed allowed Beacon Balance Annual Relative Decrease",
    async () => {
      const findings = await runTransaction(
        "0x9a1de3b55a77ce539d092b3a4b36bdd4ff179aafc03c723235c79aa21c5670f0"
      );
      expect(findings.at(1)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed Beacon Report Receiver",
    async () => {
      const findings = await runTransaction(
        "0x3f126198f641194e96cf6be0db03efc6ae92a4e1586b5062aaf373f171f0c5d2"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with added member",
    async () => {
      const findings = await runTransaction(
        "0x4754b74262afb0c0b0c344a1d0600857e23634fdf43ba32d7752cc0cec1626b1"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed quorum",
    async () => {
      const findings = await runTransaction(
        "0xd09be189f24903c8dc58676c22bd6b9ffc39bbb3f9f5c5a8613e3d198e310159"
      );
      expect(findings.at(4)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );
});
