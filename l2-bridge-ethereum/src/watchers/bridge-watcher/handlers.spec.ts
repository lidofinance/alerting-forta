import {
  handleBridgeBalance,
  handleL1BridgeTransactionEvents,
} from "./handlers";
import * as agent from "forta-agent";

import {
  BRIDGE_ETH_MIN_BALANCE,
  BRIDGE_LINK_MIN_BALANCE,
  L1_BRIDGE_EVENTS,
} from "../../constants";
import {
  BlockEvent,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";
import BigNumber from "bignumber.js";

const mockProvider = {
  getBalance: jest.fn(),
};
const mockContract = {
  balanceOf: jest.fn(),
};

jest.mock("@ethersproject/contracts", () => {
  return {
    Contract: jest.fn().mockImplementation(() => mockContract),
  };
});

describe("handleL1BridgeTransactionEvents", () => {
  it("returns findings for matching L1 bridge events", () => {
    const txEvent = {
      addresses: { [L1_BRIDGE_EVENTS[0].address]: true },
      filterLog: jest.fn().mockImplementation((event, address) => {
        if (
          event === L1_BRIDGE_EVENTS[0].event &&
          address === L1_BRIDGE_EVENTS[0].address
        ) {
          return [{ args: ["arg1", "arg2"] }];
        }
        return [];
      }),
    } as unknown as TransactionEvent;
    const findings: Finding[] = [];

    handleL1BridgeTransactionEvents(txEvent, findings);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      name: L1_BRIDGE_EVENTS[0].name,
      description: L1_BRIDGE_EVENTS[0].description(["arg1", "arg2"]),
      alertId: L1_BRIDGE_EVENTS[0].alertId,
      severity: L1_BRIDGE_EVENTS[0].severity,
      type: L1_BRIDGE_EVENTS[0].type,
      metadata: { args: "arg1,arg2" },
    });
  });

  it("returns no findings if no matching L1 bridge events", () => {
    const txEvent = {
      addresses: {},
      filterLog: jest.fn().mockReturnValue([]),
    } as unknown as TransactionEvent;

    const findings: Finding[] = [];
    handleL1BridgeTransactionEvents(txEvent, findings);

    expect(findings).toHaveLength(0);
  });

  it("handles multiple matching L1 bridge events", () => {
    const txEvent = {
      addresses: { [L1_BRIDGE_EVENTS[0].address]: true },
      filterLog: jest.fn().mockImplementation((event, address) => {
        if (
          event === L1_BRIDGE_EVENTS[0].event &&
          address === L1_BRIDGE_EVENTS[0].address
        ) {
          return [{ args: ["arg1", "arg2"] }, { args: ["arg3", "arg4"] }];
        }
        return [];
      }),
    } as unknown as TransactionEvent;

    const findings: Finding[] = [];
    handleL1BridgeTransactionEvents(txEvent, findings);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      name: L1_BRIDGE_EVENTS[0].name,
      description: L1_BRIDGE_EVENTS[0].description(["arg1", "arg2"]),
      alertId: L1_BRIDGE_EVENTS[0].alertId,
      severity: L1_BRIDGE_EVENTS[0].severity,
      type: L1_BRIDGE_EVENTS[0].type,
      metadata: { args: "arg1,arg2" },
    });
    expect(findings[1]).toMatchObject({
      name: L1_BRIDGE_EVENTS[0].name,
      description: L1_BRIDGE_EVENTS[0].description(["arg3", "arg4"]),
      alertId: L1_BRIDGE_EVENTS[0].alertId,
      severity: L1_BRIDGE_EVENTS[0].severity,
      type: L1_BRIDGE_EVENTS[0].type,
      metadata: { args: "arg3,arg4" },
    });
  });
});

describe("handleBridgeBalance", () => {
  let event: BlockEvent;

  beforeEach(() => {
    event = { block: { number: 7200 } } as BlockEvent;
    jest
      .spyOn(agent, "getEthersProvider")
      .mockReturnValue(mockProvider as never);
  });

  it("returns an empty array if block number is not a multiple of 7200", async () => {
    event = { block: { number: 7199 } } as BlockEvent;
    const findings = await handleBridgeBalance(event as never);
    expect(findings).toEqual([]);
  });

  it("returns a finding if ETH balance is below the minimum threshold", async () => {
    mockProvider.getBalance.mockResolvedValue(
      BigNumber(1e18 * (BRIDGE_ETH_MIN_BALANCE - 0.1)),
    );

    mockContract.balanceOf.mockResolvedValue(
      BigNumber(1e18 * BRIDGE_LINK_MIN_BALANCE),
    );

    const findings = await handleBridgeBalance(event as never);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      name: "Bridge ETH balance is low (0.5 ETH min)",
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    });
  });

  it("returns a finding if LINK balance is below the minimum threshold", async () => {
    mockProvider.getBalance.mockResolvedValue(
      BigNumber(1e18 * BRIDGE_ETH_MIN_BALANCE),
    );
    mockContract.balanceOf.mockResolvedValue(
      BigNumber(1e18 * (BRIDGE_LINK_MIN_BALANCE - 0.1)),
    );

    const findings = await handleBridgeBalance(event as never);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      name: "Bridge LINK balance is low (5 LINK min)",
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    });
  });

  it("returns findings for both ETH and LINK balances below the minimum threshold", async () => {
    mockProvider.getBalance.mockResolvedValue(
      BigNumber(1e18 * (BRIDGE_ETH_MIN_BALANCE - 0.1)),
    );
    mockContract.balanceOf.mockResolvedValue(
      BigNumber(1e18 * (BRIDGE_LINK_MIN_BALANCE - 0.1)),
    );

    const findings = await handleBridgeBalance(event as never);

    expect(findings).toHaveLength(2);
  });

  it("returns an empty array if both ETH and LINK balances are above the minimum threshold", async () => {
    mockProvider.getBalance.mockResolvedValue(
      BigNumber(1e18 * BRIDGE_ETH_MIN_BALANCE),
    );
    mockContract.balanceOf.mockResolvedValue(
      BigNumber(1e18 * BRIDGE_LINK_MIN_BALANCE),
    );

    const findings = await handleBridgeBalance(event as never);

    expect(findings).toEqual([]);
  });

  it("returns an array of network errors if there are errors", async () => {
    mockProvider.getBalance.mockRejectedValue(new Error("Network ETH error"));
    mockContract.balanceOf.mockRejectedValue(new Error("Network LINK error"));

    const findings = await handleBridgeBalance(event as never);

    expect(findings).toHaveLength(2);
    expect(findings[0].alertId).toEqual("NETWORK-ERROR");
    expect(findings[1].alertId).toEqual("NETWORK-ERROR");
    expect(findings[0].name).toEqual("handleBridgeBalance");
    expect(findings[1].name).toEqual("handleBridgeBalance");
    expect(findings[0].description).toEqual(
      "Error fetching bridge ETH balance",
    );
    expect(findings[1].description).toEqual(
      "Error fetching bridge LINK balance",
    );
    expect(findings[0].metadata).toMatchObject({
      message: "Network ETH error",
    });
    expect(findings[1].metadata).toMatchObject({
      message: "Network LINK error",
    });
  });
});
