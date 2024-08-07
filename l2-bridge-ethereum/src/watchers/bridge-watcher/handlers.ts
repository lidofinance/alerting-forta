import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  getEthersProvider,
  TransactionEvent,
} from "forta-agent";
import {
  BRIDGE_ETH_MIN_BALANCE,
  BRIDGE_LINK_MIN_BALANCE,
  CROSS_CHAIN_CONTROLLER_PROXY_ADDRESS,
  L1_BRIDGE_EVENTS,
  LINK_TOKEN_ADDRESS,
} from "../../constants";
import { formatEther } from "ethers";
import { networkAlert } from "../../helpers/finding";

export function handleL1BridgeTransactionEvents(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  L1_BRIDGE_EVENTS.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: eventInfo.type,
            metadata: { args: String(event.args) },
          }),
        );
      });
    }
  });
}

export async function handleBridgeBalance(event: BlockEvent) {
  if (event.block.number % 7200 !== 0) {
    return [];
  }
  const findings: Finding[] = [];

  const provider = getEthersProvider();

  try {
    const ethBalance = await provider.getBalance(
      CROSS_CHAIN_CONTROLLER_PROXY_ADDRESS,
    );
    if (ethBalance.lt(BigInt(1e18 * BRIDGE_ETH_MIN_BALANCE))) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Cross-chain bridge ETH balance is low (0.5 ETH min)",
          description: `Bridge balance is low: ${formatEther(
            ethBalance.toString(),
          )} ETH`,
          alertId: "BRIDGE-ETH-BALANCE-LOW",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: { ethBalance: ethBalance.toString() },
        }),
      );
    }
  } catch (err: unknown) {
    findings.push(
      networkAlert(
        err as Error,
        "handleBridgeBalance",
        "Error fetching bridge ETH balance",
        event.block.number,
      ),
    );
  }

  const linkContract = new ethers.Contract(
    LINK_TOKEN_ADDRESS,
    ["function balanceOf(address) returns (uint256)"],
    provider,
  );

  try {
    const linkBalance = (await linkContract.balanceOf(
      CROSS_CHAIN_CONTROLLER_PROXY_ADDRESS,
    )) as ethers.BigNumber;

    if (linkBalance.lt(BigInt(1e18 * BRIDGE_LINK_MIN_BALANCE))) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Cross-chain bridge LINK balance is low (5 LINK min)",
          description: `Bridge balance is low: ${formatEther(
            linkBalance.toString(),
          )} LINK`,
          alertId: "BRIDGE-LINK-BALANCE-LOW",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: { linkBalance: linkBalance.toString() },
        }),
      );
    }
  } catch (err: unknown) {
    findings.push(
      networkAlert(
        err as Error,
        "handleBridgeBalance",
        "Error fetching bridge LINK balance",
        event.block.number,
      ),
    );
  }

  return findings;
}
