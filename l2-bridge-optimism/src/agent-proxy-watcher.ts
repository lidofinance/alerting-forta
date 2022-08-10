import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";
import {
  PROXY_ADMIN_EVENTS,
  LIDO_PROXY_CONTRACTS,
  LidoProxy,
} from "./constants";
import { ethersProvider } from "./ethers";

// Block interval tp fetch proxy params
const BLOCK_INTERVAL = 10;

const lastImpls = new Map<string, string>();
const lastAdmins = new Map<string, string>();

export const name = "ProxyWatcher";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  await Promise.all(
    LIDO_PROXY_CONTRACTS.map(async (proxyInfo: LidoProxy) => {
      const lastImpl = await getProxyImpl(proxyInfo, currentBlock);
      lastImpls.set(proxyInfo.address, lastImpl);
      const lastAdmin = await getProxyAdmin(proxyInfo, currentBlock);
      lastAdmins.set(proxyInfo.address, lastAdmin);
    })
  );
  return {
    lastImpls: JSON.stringify(Object.fromEntries(lastImpls)),
    lastAdmins: JSON.stringify(Object.fromEntries(lastAdmins)),
  };
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleProxyAdminEvents(txEvent, findings);

  return findings;
}

function handleProxyAdminEvents(txEvent: TransactionEvent, findings: Finding[]) {
  PROXY_ADMIN_EVENTS.forEach((eventInfo) => {
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
          })
        );
      });
    }
  });
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleProxyImplementationChanges(blockEvent, findings),
    handleProxyAdminChanges(blockEvent, findings),
  ]);

  return findings;
}

async function getProxyImpl(proxyInfo: LidoProxy, blockNumber: number) {
  const implFunc = proxyInfo.functions.get("implementation");
  if (!implFunc) {
    return undefined;
  }
  const proxy = new ethers.Contract(
    proxyInfo.address,
    proxyInfo.shortABI,
    ethersProvider
  );
  return (await proxy.functions[implFunc]({ blockTag: blockNumber }))[0];
}

async function handleProxyImplementationChanges(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  if (blockEvent.blockNumber % BLOCK_INTERVAL == 0) {
    await Promise.all(
      LIDO_PROXY_CONTRACTS.map(async (proxyInfo: LidoProxy) => {
        const newImpl = await getProxyImpl(proxyInfo, blockEvent.blockNumber);
        const lastImpl = lastImpls.get(proxyInfo.address) || "";
        if (newImpl != lastImpl) {
          findings.push(
            Finding.fromObject({
              name: "Arbitrum: Proxy implementation changed",
              description:
                `Proxy implementation for ${proxyInfo.name}(${proxyInfo.address}) ` +
                `was changed form ${lastImpl} to ${newImpl}` +
                `\n(detected by func call)`,
              alertId: "PROXY-UPGRADED",
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
              metadata: { newImpl: newImpl, lastImpl: lastImpl },
            })
          );
          lastImpls.set(proxyInfo.address, newImpl);
        }
      })
    );
  }
}

async function getProxyAdmin(proxyInfo: LidoProxy, blockNumber: number) {
  const adminFunc = proxyInfo.functions.get("admin");
  if (!adminFunc) {
    return undefined;
  }
  const proxy = new ethers.Contract(
    proxyInfo.address,
    proxyInfo.shortABI,
    ethersProvider
  );
  return (await proxy.functions[adminFunc]({ blockTag: blockNumber }))[0];
}

async function handleProxyAdminChanges(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  if (blockEvent.blockNumber % BLOCK_INTERVAL == 0) {
    await Promise.all(
      LIDO_PROXY_CONTRACTS.map(async (proxyInfo: LidoProxy) => {
        const newAdmin = await getProxyAdmin(proxyInfo, blockEvent.blockNumber);
        const lastAdmin = lastAdmins.get(proxyInfo.address) || "";
        if (newAdmin != lastAdmin) {
          findings.push(
            Finding.fromObject({
              name: "Arbitrum: Proxy admin changed",
              description:
                `Proxy admin for ${proxyInfo.name}(${proxyInfo.address}) ` +
                `was changed from ${lastAdmin} to ${newAdmin}` +
                `\n(detected by func call)`,
              alertId: "PROXY-ADMIN-CHANGED",
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
              metadata: { newAdmin: newAdmin, lastAdmin: lastAdmin },
            })
          );
          lastAdmins.set(proxyInfo.address, newAdmin);
        }
      })
    );
  }
}
