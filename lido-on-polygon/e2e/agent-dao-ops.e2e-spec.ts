import { configureContainer, Finding } from "forta-agent";
import { AwilixContainer, asFunction } from "awilix";
import { provideAgentPath } from "./utils";

const BLOCK_PROCESSING_TIMEOUT = 60_000; // ms

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
      agentPath: asFunction(provideAgentPath("agent-dao-ops")),
    });

    // https://docs.forta.network/en/latest/cli/#invoke-commands-programmatically
    runTransaction = container.resolve("runHandlersOnTransaction");
    runBlock = container.resolve("runHandlersOnBlock");
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it("should process tx with rewards distribution", async () => {
    const findings = await runTransaction(
      "0x19b1c8bdaab9cb2dd9fc89ca9ee916cd050ce8552394479a21a6fbac7271dbb4"
    );
    expect(findings.at(0)).toMatchSnapshot();
  });

  it("should process tx with polygon checkpoint reward change", async () => {
    const findings = await runTransaction(
      "0xfe9ef91c9b05aac2cdad146e90dd8145f8664408c0343504d5dc64077bf9d223"
    );
    expect(findings.at(0)).toMatchSnapshot();
  });

  it("should process tx with pooled MATIC delegation", async () => {
    const findings = await runTransaction(
      "0xe4577288b59eb8f834287151d63b0bd9a76e5ec6e177e9930b35d8dc4bf8daad"
    );
    expect(findings.at(0)).toMatchSnapshot();
  });

  it(
    "should process block with low deposit executor balance",
    async () => {
      const findings = await runBlock(15150957);
      expect(findings.at(0)).toMatchSnapshot();
    },
    BLOCK_PROCESSING_TIMEOUT
  );
});