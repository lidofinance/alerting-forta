import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-dao-ops e2e tests", () => {
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
        provideAgentPath("subagents/dao-ops/agent-dao-ops")
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
      const findings = await runBlock(16704061);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with low staking limit (30%)",
    async () => {
      const findings = await runBlock(16704061);
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with huge buffered ETH amount and low deposit executor balance",
    async () => {
      const findings = await runBlock(16704433);
      findings.sort((a, b) => b.type - a.type);
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process block with MEV Allow list: Super low relay count",
    async () => {
      const findings = await runBlock(15960610);
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  // disabled due to changes in the event signatures
  // it(
  //   "should process tx with paused deposits",
  //   async () => {
  //     const findings = await runTransaction(
  //       "0x878e2a2ff5018e680dfd37031ed8b5d1d7e2ec41a4bd640168f347bbedf31a7b"
  //     );
  //     expect(findings.at(0)).toMatchSnapshot();
  //   },
  //   TEST_TIMEOUT
  // );

  // it(
  //   "should process tx with unpaused deposits",
  //   async () => {
  //     const findings = await runTransaction(
  //       "0xd5ddc8c0e3e24b36ffac6e804894c5c09c012e9079a9d9df24f503f1e75e2f64"
  //     );
  //     expect(findings.at(0)).toMatchSnapshot();
  //   },
  //   TEST_TIMEOUT
  // );

  it(
    "should process tx with added guardian",
    async () => {
      const findings = await runTransaction(
        "0x60d9392de6c6ae3f8ca8003cce414fc420d705c9a1c8051b9869b0b870d2ebbe"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed guardian quorum",
    async () => {
      const findings = await runTransaction(
        "0x37ef7e9e71809be37143e3976bae7859268be3fac6728d69cd7b5d6d9cf8d24a"
      );
      expect(findings.at(4)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed max deposit",
    async () => {
      const findings = await runTransaction(
        "0x9c10852a83c77204f255705e581c21ebcc28c021dfaff4c02707a4cee1eedde2"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed min deposit block",
    async () => {
      const findings = await runTransaction(
        "0x9c10852a83c77204f255705e581c21ebcc28c021dfaff4c02707a4cee1eedde2"
      );
      expect(findings.at(1)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed owner of the contract",
    async () => {
      const findings = await runTransaction(
        "0x9c10852a83c77204f255705e581c21ebcc28c021dfaff4c02707a4cee1eedde2"
      );
      expect(findings.at(2)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed distribution fee",
    async () => {
      const findings = await runTransaction(
        "0xe61167aa87b2a7aa9bd68834bf703877d22315d6d765345ebf0135eb8c33c406"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with changed protocol contracts",
    async () => {
      const findings = await runTransaction(
        "0xdd76a4d06199eb017e322e2e152f88841d92488ef5e02809bac45c842244059e"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with received EL rewards",
    async () => {
      const findings = await runTransaction(
        "0x60a7671264723099c564d33b04af6617195093531f012941e75c372dcb9ba242"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with EL rewards withdrawal limit set",
    async () => {
      const findings = await runTransaction(
        "0x3f126198f641194e96cf6be0db03efc6ae92a4e1586b5062aaf373f171f0c5d2"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with EL rewards vault set and staking changes",
    async () => {
      const findings = await runTransaction(
        "0x11a48020ae69cf08bd063f1fbc8ecf65bd057015aaa991bf507dbc598aadb68e"
      );
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with transferred ownership of Insurance fund",
    async () => {
      const findings = await runTransaction(
        "0x91c7c2f33faf3b5fb097138c1d49c1d4e83f99e1c3b346b3cad35a5928c03b3a"
      );
      expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );
});
