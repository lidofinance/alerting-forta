import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import {
  provideAgentPath,
  provideRunBlock,
  provideRunTransaction,
} from "./utils";

import { getRoleMembers } from "../src/subagents_v2/acl-changes/agent-acl-changes";
import { roleByName } from "../src/subagents_v2/acl-changes/utils";

const TEST_TIMEOUT = 60_000; // ms

describe("agent-acl-changes e2e tests", () => {
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
        provideAgentPath("subagents_v2/acl-changes/agent-acl-changes")
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
    "should process tx with permission change",
    async () => {
      const findings = await runTransaction(
        "0x46d937a9bb533feaf3b7936d230822eecc65d7ff4f6e38a4e17d3ca59cdf0799"
      );
      expect(findings.at(0)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it(
    "should process tx with permission manager changed",
    async () => {
      const findings = await runTransaction(
        "0x11a48020ae69cf08bd063f1fbc8ecf65bd057015aaa991bf507dbc598aadb68e"
      );
      expect(findings.at(2)).toMatchSnapshot();
    },
    TEST_TIMEOUT
  );

  it("should get role's members of a contract", async () => {
    const admins = await getRoleMembers(
      "0xbf05A929c3D7885a6aeAd833a992dA6E5ac23b09", // OracleDaemonConfig
      roleByName("DEFAULT_ADMIN_ROLE").hash,
      "latest"
    );

    expect(admins).toEqual([
      "0x3e40d73eb977dc6a537af587d48316fee66e9c8c", // Aragon Agent
    ]);

    const members = await getRoleMembers(
      "0xD15a672319Cf0352560eE76d9e89eAB0889046D3", // Burner
      roleByName("REQUEST_BURN_SHARES_ROLE").hash,
      "latest"
    );

    expect(
      members.includes("0xae7ab96520de3a18e5e111b5eaab095312d7fe84") // Lido
    ).toBeTruthy();
  });
});
