import BigNumber from "bignumber.js";
import * as forta from "forta-agent";

import {
  pendingTopUpMotions,
  enactedTopUpMotions,
  handleTransaction,
} from "./agent-reward-programs";
import { EASY_TRACK_ADDRESS, TOP_UP_REWARDS_ADDRESS } from "./constants";

describe("phishing-detect", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    logSpy = jest.spyOn(console, "log");
    logSpy.mockImplementation(() => {});
  });

  afterEach(async () => {
    jest.clearAllMocks();

    pendingTopUpMotions.clear();
    enactedTopUpMotions.clear();
  });

  const tx = {
    addresses: {
      [EASY_TRACK_ADDRESS]: true,
    },
    filterLog: jest.fn(),
  };

  describe("handleTransaction", () => {
    it("should process MotionCreated event", async () => {
      const motionId = 42;
      const motionAmount = 786000; // encoded in _evmScriptCallData below

      const motionCreatedEvent = {
        args: {
          _motionId: new BigNumber(motionId),
          _evmScriptFactory: TOP_UP_REWARDS_ADDRESS,
          _evmScriptCallData:
            "0x" +
            [
              "0000000000000000000000000000000000000000000000000000000000000040",
              "0000000000000000000000000000000000000000000000000000000000000080",
              "0000000000000000000000000000000000000000000000000000000000000001",
              "00000000000000000000000087d93d9b2c672bf9c9642d853a8682546a5012b5",
              "0000000000000000000000000000000000000000000000000000000000000001",
              "00000000000000000000000000000000000000000000a6712537898587400000",
            ].join(""),
        },
      };

      tx.filterLog.mockImplementation((abi: string) => {
        if (abi.includes("MotionCreated")) {
          return [motionCreatedEvent];
        }

        return [];
      });

      const findings = await handleTransaction(tx as any);
      expect(findings.length).toEqual(1);
      expect(findings.at(0)).toEqual(
        expect.objectContaining({
          alertId: "REWARD-PROGRAM-TOP-UP-MOTION-CREATED",
          severity: forta.FindingSeverity.Info,
          type: forta.FindingType.Info,
          metadata: expect.objectContaining({
            motionId: String(motionId),
            amountPending: String(motionAmount),
            spentTotal: String(0),
            pendingTotal: String(motionAmount),
            pendingMotions: `[${motionId}]`,
            enactedMotions: "[]",
          }),
        })
      );

      expect(pendingTopUpMotions.get(motionId)).toBeDefined();
      expect(enactedTopUpMotions.size).toEqual(0);
    });

    it("should process MotionEnacted event", async () => {
      const motionId = 42;
      const motionAmount = 1;

      const motionEnactedEvent = {
        args: {
          _motionId: motionId,
        },
      };

      tx.filterLog.mockImplementation((abi: string) => {
        if (abi.includes("MotionEnacted")) {
          return [motionEnactedEvent];
        }

        return [];
      });

      pendingTopUpMotions.set(motionId, new BigNumber(motionAmount));

      const findings = await handleTransaction(tx as any);
      expect(findings.length).toEqual(1);
      expect(findings.at(0)).toEqual(
        expect.objectContaining({
          alertId: "REWARD-PROGRAM-TOP-UP-MOTION-ENACTED",
          severity: forta.FindingSeverity.Info,
          type: forta.FindingType.Info,
          metadata: expect.objectContaining({
            motionId: String(motionId),
            spentTotal: String(0),
            pendingTotal: String(0),
            enactedMotions: `[${motionId}]`,
            pendingMotions: "[]",
          }),
        })
      );

      expect(enactedTopUpMotions.get(motionId)).toBeDefined();
      expect(pendingTopUpMotions.size).toEqual(0);
    });
  });
});
