import { handleL1BridgeTransactionEvents } from "./handlers";

import { L1_BRIDGE_EVENTS } from "../../constants";
import { Finding, TransactionEvent } from "forta-agent";

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
