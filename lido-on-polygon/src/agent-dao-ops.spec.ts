import { Contract } from "ethers";
import {
  BlockEvent,
  Finding,
  FindingType,
  FindingSeverity,
  TransactionEvent,
} from "forta-agent";

import {
  handleBufferedMatic,
  handleChekpointRewardUpdateEvent,
  handleDepositExecutorBalance,
  handleProxyAdmin,
  handleProxyAdminEvents,
  handleProxyOwner,
  handleRewardDistributionEvent,
  handleRewardsDistribution,
  initialize,
} from "./agent-dao-ops";
import {
  ETH_DECIMALS as _1ETH,
  MATIC_DECIMALS as _1MATIC,
  MAX_REWARDS_DISTRIBUTION_INTERVAL,
  ONE_HOUR,
  PROXY_ADMIN_ADDRESS,
  ST_MATIC_TOKEN_ADDRESS,
} from "./constants";
import { ethersProvider } from "./ethers";

///
jest.mock("./ethers");
jest.mock("ethers");
///

describe("lido-on-polygon", () => {
  let logSpy: jest.SpyInstance;
  let queryFilterSpy: jest.SpyInstance;

  const now = 1234567;

  beforeAll(async () => {
    logSpy = jest.spyOn(console, "log");
    logSpy.mockImplementation(() => {});

    queryFilterSpy = jest.spyOn(Contract.prototype, "queryFilter");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    (Contract.prototype as any).filters = {
      ["DistributeRewardsEvent"]() {
        console.log("EVENT_DRE");
      },
      ["NewHeaderBlock"]() {
        console.log("EVENT_NHB");
      },
    };

    const fEvent = {
      getBlock: async () => {
        return {
          timestamp: now,
        };
      },
      args: {
        _amount: _1MATIC.multipliedBy(42), // last reward
      },
    };

    queryFilterSpy.mockResolvedValue([fEvent, fEvent, fEvent]);

    // init module variables
    // [DaoOps] checkpointsInLastInterval: 3
    // [DaoOps] lastRewardsDistributeTime: 1234567
    await initialize(NaN);
  });

  afterEach(() => {
    (Contract.prototype as any).functions = {};
    (Contract.prototype as any).filters = {};
  });

  it("should process handleBufferedMatic", async () => {
    const bEvent = {
      block: {
        timestamp: now,
      },
    };

    (Contract.prototype as any).functions = {
      balanceOf: async () => {
        console.log("FUNC_BLO");
        return _1MATIC.multipliedBy(42);
      },
      getTotalPooledMatic: async () => {
        console.log("FUNC_TPL");
        return _1MATIC;
      },
    };

    const findings: Finding[] = [];

    await handleBufferedMatic(bEvent as BlockEvent, findings);

    // event started and should be kept at least for 1 hour
    expect(findings.length).toBe(0);

    // shift clock
    bEvent.block.timestamp += ONE_HOUR + 1;

    await handleBufferedMatic(bEvent as BlockEvent, findings);

    expect(findings.length).toBe(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "HUGE-BUFFERED-MATIC",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  });

  it("should process handleRewardsDistribution", async () => {
    const findings: Finding[] = [];

    const bEvent = {
      block: {
        timestamp: now + MAX_REWARDS_DISTRIBUTION_INTERVAL + 1,
      },
    };

    await handleRewardsDistribution(bEvent as BlockEvent, findings);

    expect(findings.length).toBe(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "STMATIC-REWARDS-DISTRIBUTION-DELAY",
        severity: FindingSeverity.High,
        type: FindingType.Degraded,
      })
    );
  });

  it("should process handleProxyAdmin", async () => {
    const bEvent = {
      block: {
        timestamp: now,
      },
    };

    (Contract.prototype as any).functions = {
      getProxyAdmin: async () => {
        return "0xdeadbeef";
      },
    };

    const findings: Finding[] = [];

    await handleProxyAdmin(bEvent as BlockEvent, findings);

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "INVALID-PROXY-ADMIN-ADDR",
        severity: FindingSeverity.Critical,
        type: FindingType.Exploit,
      })
    );
  });

  it("should process handleProxyOwner", async () => {
    const bEvent = {
      block: {
        timestamp: now,
      },
    };

    (Contract.prototype as any).functions = {
      owner: async () => {
        return "0xdeadbeef";
      },
    };

    const findings: Finding[] = [];

    await handleProxyOwner(bEvent as BlockEvent, findings);

    expect(findings.length).toBe(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "INVALID-PROXY-ADMIN-OWNER",
        severity: FindingSeverity.Critical,
        type: FindingType.Exploit,
      })
    );
  });

  it("should process handleDepositExecutorBalance", async () => {
    const bEvent = {
      blockNumber: 100000,
      block: {
        timestamp: now,
      },
    };

    ethersProvider.getBalance = jest
      .fn()
      .mockResolvedValue(_1ETH.multipliedBy(0.42));

    const findings: Finding[] = [];

    await handleDepositExecutorBalance(bEvent as BlockEvent, findings);

    expect(findings.length).toBe(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "LOW-DEPOSIT-EXECUTOR-BALANCE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  });

  it("should process handleRewardDistributionEvent", async () => {
    const tEvent = {
      to: ST_MATIC_TOKEN_ADDRESS,
      addresses: { [ST_MATIC_TOKEN_ADDRESS]: true },
      blockNumber: 16725739,
      filterLog: () => {
        return [
          {
            args: {
              _amount: _1MATIC, // new reward
            },
          },
        ];
      },
    } as any;

    const findings: Finding[] = [];

    await handleRewardDistributionEvent(tEvent as TransactionEvent, findings);

    expect(findings.length).toBe(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "STMATIC-REWARDS-DECREASED",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  });

  it("should process handleProxyAdminEvents", () => {
    const tEvent = {
      to: PROXY_ADMIN_ADDRESS,
      addresses: { [PROXY_ADMIN_ADDRESS]: true },
      filterLog: () => {
        return [
          {
            args: {
              1: "0xdeadbeef",
            },
          },
        ];
      },
    } as any;

    const findings: Finding[] = [];

    handleProxyAdminEvents(tEvent, findings);

    expect(findings.length).toBe(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "PROXY-ADMIN-OWNER-CHANGE",
        severity: FindingSeverity.Critical,
        type: FindingType.Suspicious,
      })
    );
  });

  it("should process handleCheckpointRewardUpdateEvent", () => {
    const tEvent = {
      filterLog: () => {
        return [
          {
            args: {
              oldReward: 1,
              newReward: 1,
            },
          },
        ];
      },
    } as any;

    const findings: Finding[] = [];

    handleChekpointRewardUpdateEvent(tEvent, findings);

    expect(findings.length).toBe(1);
    expect(findings.at(0)).toEqual(
      expect.objectContaining({
        alertId: "STMATIC-CHEKPOINT-REWARD-UPDATE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  });
});
