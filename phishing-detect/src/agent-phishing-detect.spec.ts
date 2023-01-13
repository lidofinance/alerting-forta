import crypto from "crypto";
import * as forta from "forta-agent";

import {
  spenders,
  handleTransaction,
  handleBlock,
} from "./agent-phishing-detect";
import {
  MONITORED_ERC20_ADDRESSES,
  UNIQ_DELEGATES_THRESHOLD_CONTRACT,
  UNIQ_DELEGATES_THRESHOLD_EOA,
  BLOCKS_PER_HOUR,
} from "./constants";

function randomAddress(): string {
  return "0x" + crypto.randomBytes(20).toString("hex");
}

describe("phishing-detect", () => {
  const token = MONITORED_ERC20_ADDRESSES.keys().next().value;
  const approver = randomAddress();
  const spender = randomAddress();

  let logSpy: jest.SpyInstance;

  const txEventWithHighApproval = {
    hash: "fakeTxHash",
    from: approver,
    to: token,
    block: {
      timestamp: 1234567,
    },
    filterLog() {
      return [
        {
          address: token,
          args: {
            value: "0x207ab57c0bb17971", // some big amount
            spender,
          },
        },
      ];
    },
  } as any;

  const dummyBlock = {
    blockNumber: BLOCKS_PER_HOUR * 10,
  } as any;

  beforeEach(async () => {
    logSpy = jest.spyOn(console, "log");
    logSpy.mockImplementation(() => {});
  });

  afterEach(async () => {
    jest.clearAllMocks();
    spenders.clear();
  });

  it("should process a suspicious transaction to contract", async () => {
    // init cache
    spenders.set(spender.toLowerCase(), {
      isContract: true,
      tokens: new Map(),
      reportedApproversCount: 0,
      reportedTokenTypesCount: 0,
    });

    // add hits
    spenders
      .get(spender.toLowerCase())
      ?.tokens.set(
        token,
        new Set(
          Array.from({ length: UNIQ_DELEGATES_THRESHOLD_CONTRACT - 1 }, () =>
            randomAddress()
          )
        )
      );

    handleTransaction(txEventWithHighApproval);

    expect(
      spenders.get(spender.toLowerCase())?.tokens.get(token)?.size
    ).toEqual(UNIQ_DELEGATES_THRESHOLD_CONTRACT);
  });

  it("should produce alert on a suspicious approvals to contract", async () => {
    // init cache
    spenders.set(spender.toLowerCase(), {
      isContract: true,
      tokens: new Map(),
      reportedApproversCount: 0,
      reportedTokenTypesCount: 0,
    });

    // add hits
    spenders
      .get(spender.toLowerCase())
      ?.tokens.set(
        token,
        new Set(
          Array.from({ length: UNIQ_DELEGATES_THRESHOLD_CONTRACT }, () =>
            randomAddress()
          )
        )
      );

    const findings = await handleBlock(dummyBlock);

    expect(findings.length).toEqual(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "PHISHING-CONTRACT-DETECTED",
        severity: forta.FindingSeverity.Medium,
        type: forta.FindingType.Suspicious,
        metadata: { spender: spender.toLowerCase() },
      })
    );

    const findingsSecond = await handleBlock(dummyBlock);

    expect(findingsSecond.length).toEqual(0);
  });

  it("should process a suspicious transaction to EOA", async () => {
    // init cache
    spenders.set(spender.toLowerCase(), {
      isContract: false,
      tokens: new Map(),
      reportedApproversCount: 0,
      reportedTokenTypesCount: 0,
    });

    // add hits
    spenders
      .get(spender.toLowerCase())
      ?.tokens.set(
        token,
        new Set(
          Array.from({ length: UNIQ_DELEGATES_THRESHOLD_EOA - 1 }, () =>
            randomAddress()
          )
        )
      );

    handleTransaction(txEventWithHighApproval);

    expect(
      spenders.get(spender.toLowerCase())?.tokens.get(token)?.size
    ).toEqual(UNIQ_DELEGATES_THRESHOLD_EOA);
  });

  it("should produce alert on a suspicious approvals to EOA", async () => {
    // init cache
    spenders.set(spender.toLowerCase(), {
      isContract: false,
      tokens: new Map(),
      reportedApproversCount: 0,
      reportedTokenTypesCount: 0,
    });

    // add hits
    spenders
      .get(spender.toLowerCase())
      ?.tokens.set(
        token,
        new Set(
          Array.from({ length: UNIQ_DELEGATES_THRESHOLD_EOA }, () =>
            randomAddress()
          )
        )
      );
    const findings = await handleBlock(dummyBlock);

    expect(findings.length).toEqual(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "PHISHING-EOA-DETECTED",
        severity: forta.FindingSeverity.High,
        type: forta.FindingType.Suspicious,
        metadata: { spender: spender.toLowerCase() },
      })
    );

    const findingsSecond = await handleBlock(dummyBlock);

    expect(findingsSecond.length).toEqual(0);
  });
});
