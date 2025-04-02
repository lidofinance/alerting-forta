import {
  FindingType,
  FindingSeverity,
  TransactionEvent,
  ethers,
} from "forta-agent";

import * as agentEthereum from "../agent-ethereum";

import {
  APPROVAL_EVENT,
  BIG_ALLOWANCES,
  Blockchain,
  LIDO_AGENT_ETHEREUM,
  SAFES,
  USDT_ADDRESS,
} from "../constants";
import { eventSig } from "../helpers";

const TEST_SAFE = {
  address: SAFES[Blockchain.ETH][0][0],
  name: SAFES[Blockchain.ETH][0][1],
};

describe("Ethereum multisig watcher agent", () => {
  let mockTxEvent: TransactionEvent;
  let mockLog: any;
  const NON_AGENT_SPENDER = "0xF0211b7660680B49De1A7E9f25C65660F0a13Fea";
  const APPROVAL_TOPIC = ethers.utils.id(eventSig(APPROVAL_EVENT));
  const TX_HASH = "0xtxhash";

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleApprovalEvents", () => {
    it("should return empty findings if no approval events", () => {
      mockTxEvent = { logs: [] } as unknown as TransactionEvent;

      const findings = agentEthereum.handleApprovalEvents(mockTxEvent);

      expect(findings).toHaveLength(0);
    });

    it("should detect token approval revoked when safe owner revokes Lido agent approval", () => {
      ethers.utils.Interface.prototype.parseLog = jest.fn().mockReturnValue({
        args: {
          owner: TEST_SAFE.address,
          spender: LIDO_AGENT_ETHEREUM,
          value: ethers.BigNumber.from(0),
        },
      });

      mockLog = {
        topics: [
          APPROVAL_TOPIC,
          ethers.utils.hexZeroPad(TEST_SAFE.address, 32), // owner topic
          ethers.utils.hexZeroPad(LIDO_AGENT_ETHEREUM, 32), // spender topic
        ],
        data: ethers.utils.hexZeroPad("0x0", 32), // value = 0
      };

      mockTxEvent = {
        logs: [mockLog],
        transaction: { hash: TX_HASH },
      } as unknown as TransactionEvent;

      const findings = agentEthereum.handleApprovalEvents(mockTxEvent);

      expect(findings).toHaveLength(1);
      expect(findings[0]).toEqual(
        expect.objectContaining({
          name: "🚨 Gnosis Safe: Token approval revoked",
          alertId: "SAFE-APPROVAL-REVOKED",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      expect(findings[0].description).toContain(
        "Safe token approval given to Aragon agent contract has been revoked"
      );
    });

    it("should detect unlimited allowance when safe owner grants unlimited approval to non-Lido address", () => {
      ethers.utils.Interface.prototype.parseLog = jest.fn().mockReturnValue({
        args: {
          owner: TEST_SAFE.address,
          spender: NON_AGENT_SPENDER,
          value: ethers.constants.MaxUint256,
        },
      });

      mockLog = {
        address: USDT_ADDRESS, // Token address
        topics: [
          APPROVAL_TOPIC,
          ethers.utils.hexZeroPad(TEST_SAFE.address, 32), // owner topic
          ethers.utils.hexZeroPad(NON_AGENT_SPENDER, 32), // spender topic
        ],
        data: ethers.utils.hexZeroPad(
          ethers.constants.MaxUint256.toHexString(),
          32
        ),
      };

      mockTxEvent = {
        logs: [mockLog],
        transaction: { hash: TX_HASH },
      } as unknown as TransactionEvent;

      const findings = agentEthereum.handleApprovalEvents(mockTxEvent);

      expect(findings).toHaveLength(1);
      expect(findings[0]).toEqual(
        expect.objectContaining({
          name: "🚨 Gnosis Safe: Unlimited allowance has been granted",
          alertId: "SAFE-UNLIMITED-ALLOWANCE",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      expect(findings[0].description).toContain(
        "Unlimited allowance has been granted to an address other than the Aragon Agent"
      );
    });

    it("should detect large allowance when safe owner grants large approval to non-Lido address", () => {
      const bigAllowanceInfo = BIG_ALLOWANCES[USDT_ADDRESS]!;
      const bigAllowanceValue = ethers.utils.parseUnits(
        (parseInt(bigAllowanceInfo.allowance) + 1).toString(),
        bigAllowanceInfo.decimals
      );
      ethers.utils.Interface.prototype.parseLog = jest.fn().mockReturnValue({
        args: {
          owner: TEST_SAFE.address,
          spender: NON_AGENT_SPENDER,
          value: bigAllowanceValue,
        },
      });
      mockLog = {
        address: USDT_ADDRESS, // Token address
        topics: [
          APPROVAL_TOPIC,
          ethers.utils.hexZeroPad(TEST_SAFE.address, 32), // owner topic
          ethers.utils.hexZeroPad(NON_AGENT_SPENDER, 32), // spender topic
        ],
        data: ethers.utils.hexZeroPad(bigAllowanceValue.toHexString(), 32),
      };

      // Mock the tx event
      mockTxEvent = {
        logs: [mockLog],
        transaction: { hash: TX_HASH },
      } as unknown as TransactionEvent;

      const findings = agentEthereum.handleApprovalEvents(mockTxEvent);

      expect(findings).toHaveLength(1);
      expect(findings[0]).toEqual(
        expect.objectContaining({
          name: "🚨 Gnosis Safe: A large allowance has been approved",
          alertId: "SAFE-BIG-ALLOWANCE",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      expect(findings[0].description).toContain(
        "A large allowance has been approved for a spender other than the Aragon Agent"
      );
    });

    it("should not create finding when approval is not from a safe", () => {
      ethers.utils.Interface.prototype.parseLog = jest.fn().mockReturnValue({
        args: {
          owner: NON_AGENT_SPENDER,
          spender: LIDO_AGENT_ETHEREUM,
          value: ethers.BigNumber.from(0),
        },
      });

      mockLog = {
        address: USDT_ADDRESS, // Token address
        topics: [
          APPROVAL_TOPIC,
          ethers.utils.hexZeroPad(NON_AGENT_SPENDER, 32), // non-safe owner
          ethers.utils.hexZeroPad(LIDO_AGENT_ETHEREUM, 32), // spender topic
        ],
      };

      // Mock the tx event
      mockTxEvent = {
        logs: [mockLog],
        transaction: { hash: TX_HASH },
      } as unknown as TransactionEvent;

      const findings = agentEthereum.handleApprovalEvents(mockTxEvent);

      expect(findings).toHaveLength(0);
    });

    it("should not create finding when approval to Lido agent is not zero", () => {
      ethers.utils.Interface.prototype.parseLog = jest.fn().mockReturnValue({
        args: {
          owner: TEST_SAFE.address,
          spender: LIDO_AGENT_ETHEREUM,
          value: ethers.BigNumber.from(100), // Non-zero value
        },
      });

      mockLog = {
        address: USDT_ADDRESS, // Token address
        topics: [
          APPROVAL_TOPIC,
          ethers.utils.hexZeroPad(TEST_SAFE.address, 32), // owner topic
          ethers.utils.hexZeroPad(LIDO_AGENT_ETHEREUM, 32), // spender topic
        ],
        data: ethers.utils.hexZeroPad("0x64", 32), // value = 100
      };

      // Mock the tx event
      mockTxEvent = {
        logs: [mockLog],
        transaction: { hash: TX_HASH },
      } as unknown as TransactionEvent;

      const findings = agentEthereum.handleApprovalEvents(mockTxEvent);

      expect(findings).toHaveLength(0);
    });

    it("should not create finding when approval to non-Lido agent is small", () => {
      const bigAllowanceInfo = BIG_ALLOWANCES[USDT_ADDRESS]!;
      const bigAllowanceValue = ethers.utils.parseUnits(
        (parseInt(bigAllowanceInfo.allowance) - 1).toString(),
        bigAllowanceInfo.decimals
      );
      ethers.utils.Interface.prototype.parseLog = jest.fn().mockReturnValue({
        args: {
          owner: TEST_SAFE.address,
          spender: NON_AGENT_SPENDER,
          value: bigAllowanceValue,
        },
      });
      mockLog = {
        address: USDT_ADDRESS, // Token address
        topics: [
          APPROVAL_TOPIC,
          ethers.utils.hexZeroPad(TEST_SAFE.address, 32), // owner topic
          ethers.utils.hexZeroPad(NON_AGENT_SPENDER, 32), // spender topic
        ],
        data: ethers.utils.hexZeroPad(bigAllowanceValue.toHexString(), 32),
      };

      // Mock the tx event
      mockTxEvent = {
        logs: [mockLog],
        transaction: { hash: TX_HASH },
      } as unknown as TransactionEvent;

      const findings = agentEthereum.handleApprovalEvents(mockTxEvent);

      expect(findings).toHaveLength(0);
    });
  });
});
