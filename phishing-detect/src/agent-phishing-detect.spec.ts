import crypto from "crypto";
import * as forta from "forta-agent";

import {
  spenders,
  spendersLastAlerted,
  handleTransaction,
} from "./agent-phishing-detect";
import {
  MONITORED_ERC20_ADDRESSES,
  UNIQ_DELEGATES_THRESHOLD_CONTRACT,
  UNIQ_DELEGATES_THRESHOLD_EOA,
} from "./constants";

function randromAddress(): string {
  return "0x" + crypto.randomBytes(20).toString("hex");
}

describe("phishing-detect", () => {
  const token = MONITORED_ERC20_ADDRESSES.keys().next().value;
  const approver = randromAddress();
  const spender = randromAddress();

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

  beforeEach(async () => {
    jest
      .spyOn(forta, "getTransactionReceipt")
      .mockImplementation(async (_: string) => {
        return { status: true } as any;
      }); // successful always

    logSpy = jest.spyOn(console, "log");
    logSpy.mockImplementation(() => {});
  });

  afterEach(async () => {
    jest.clearAllMocks();
    spendersLastAlerted.clear();
    spenders.clear();
  });

  it("should process a suspicious transaction to contract", async () => {
    // init cache
    spenders.set(spender.toLowerCase(), {
      isContract: true,
      tokens: new Map(),
    });

    // add hits
    spenders
      .get(spender.toLowerCase())
      ?.tokens.set(
        token,
        new Set(
          Array.from({ length: UNIQ_DELEGATES_THRESHOLD_CONTRACT - 1 }, () =>
            randromAddress()
          )
        )
      );

    const findings = await handleTransaction(txEventWithHighApproval);

    expect(findings.length).toEqual(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "HIGH-ERC20-APPROVALS",
        severity: forta.FindingSeverity.High,
        type: forta.FindingType.Suspicious,
        metadata: expect.objectContaining({
          spender,
          token,
        }),
      })
    );
  });

  it("should process a suspicious transaction to EOA", async () => {
    // init cache
    spenders.set(spender.toLowerCase(), {
      isContract: false,
      tokens: new Map(),
    });

    // add hits
    spenders
      .get(spender.toLowerCase())
      ?.tokens.set(
        token,
        new Set(
          Array.from({ length: UNIQ_DELEGATES_THRESHOLD_EOA - 1 }, () =>
            randromAddress()
          )
        )
      );

    const findings = await handleTransaction(txEventWithHighApproval);

    expect(findings.length).toEqual(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "HIGH-ERC20-APPROVALS",
        severity: forta.FindingSeverity.Critical,
        type: forta.FindingType.Suspicious,
        metadata: expect.objectContaining({
          spender,
          token,
        }),
      })
    );
  });
});
