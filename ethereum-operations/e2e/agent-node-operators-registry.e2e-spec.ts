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
      // todo: should be uncommented after v2
      // const findings = await runTransaction(
      //   "0x0397a4af942b58698cce7b5e7610dc7da41309b311318a5bc5ff54356bca74e7"
      // );
      // expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with set NO Stake limit by NON-EasyTrack action",
    async () => {
      // todo: should be uncommented after v2
      // const findings = await runTransaction(
      //   "0x06c62f1d1fcfe2cd92c9b1e571b7bcc37d9ee541a6fae7be48d3f5bae2e07d3c"
      // );
      // expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );

  it(
    "should process tx with added Node operator",
    async () => {
      // todo: should be uncommented after v2
      // const findings = await runTransaction(
      //   "0x05ffd9394c9a28f361b7ff1b135a52c173fe5be55e3e639cf7088f0436903aab"
      // );
      // expect(findings).toMatchSnapshot();
    },
    TEST_TIMEOUT,
  );
});
