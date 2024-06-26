import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-dao-ops e2e tests", () => {
  let runBlock: (
    blockHashOrNumber: string | number,
    initBlock?: number,
  ) => Promise<Finding[]>;
  let runTransaction: (
    txHash: string,
    initBlock?: number,
  ) => Promise<Finding[]>;
  let logSpy: jest.SpyInstance;
  let timeSpy: jest.SpyInstance;
  const initBlock = 19205859;

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
        provideAgentPath("subagents/set-ops/agent-set-ops"),
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
    "should process block with low staking limit (10%)",
    async () => {
      let findings = await runBlock(16704075, initBlock);
      findings.sort();
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process block with low staking limit (30%)",
    async () => {
      let findings = await runBlock(16704075, initBlock);
      findings.sort();
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process block with huge buffered ETH amount and low deposit executor balance",
    async () => {
      let findings = await runBlock(17241550, initBlock);
      findings.sort();
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process block with MEV Allow list: Super low relay count",
    async () => {
      let findings = await runBlock(15960625, initBlock);
      findings.sort();
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with added guardian",
    async () => {
      let findings = await runTransaction(
        "0x60d9392de6c6ae3f8ca8003cce414fc420d705c9a1c8051b9869b0b870d2ebbe",
        initBlock,
      );
      findings.sort();
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with changed guardian quorum",
    async () => {
      let findings = await runTransaction(
        "0x37ef7e9e71809be37143e3976bae7859268be3fac6728d69cd7b5d6d9cf8d24a",
        initBlock,
      );
      findings.sort();
      expect(findings.at(4)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with changed max deposit",
    async () => {
      let findings = await runTransaction(
        "0x9c10852a83c77204f255705e581c21ebcc28c021dfaff4c02707a4cee1eedde2",
        initBlock,
      );
      findings.sort();
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with changed min deposit block",
    async () => {
      let findings = await runTransaction(
        "0x9c10852a83c77204f255705e581c21ebcc28c021dfaff4c02707a4cee1eedde2",
        initBlock,
      );
      findings.sort();
      expect(findings.at(1)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with changed owner of the contract",
    async () => {
      let findings = await runTransaction(
        "0x9c10852a83c77204f255705e581c21ebcc28c021dfaff4c02707a4cee1eedde2",
        initBlock,
      );
      findings.sort();
      expect(findings.at(2)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with changed distribution fee",
    async () => {
      let findings = await runTransaction(
        "0xe61167aa87b2a7aa9bd68834bf703877d22315d6d765345ebf0135eb8c33c406",
        initBlock,
      );
      findings.sort();
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with changed protocol contracts",
    async () => {
      let findings = await runTransaction(
        "0xdd76a4d06199eb017e322e2e152f88841d92488ef5e02809bac45c842244059e",
        initBlock,
      );
      findings.sort();
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with EL rewards withdrawal limit set",
    async () => {
      let findings = await runTransaction(
        "0x3f126198f641194e96cf6be0db03efc6ae92a4e1586b5062aaf373f171f0c5d2",
        initBlock,
      );
      findings.sort();
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with EL rewards vault set and staking changes",
    async () => {
      let findings = await runTransaction(
        "0x11a48020ae69cf08bd063f1fbc8ecf65bd057015aaa991bf507dbc598aadb68e",
        initBlock,
      );
      findings.sort();
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with transferred ownership of Insurance fund",
    async () => {
      let findings = await runTransaction(
        "0x91c7c2f33faf3b5fb097138c1d49c1d4e83f99e1c3b346b3cad35a5928c03b3a",
        initBlock,
      );
      findings.sort();
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
