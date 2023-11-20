import { ethers, Finding, FindingType, FindingSeverity } from "forta-agent";
import { Log } from "@ethersproject/abstract-provider";

import {
  PROXY_ADMIN_EVENTS,
  LidoZkSyncProxy,
  LIDO_OSSIFIABLE_PROXY_CONTRACTS,
  LidoProxy,
  LIDO_TRANSPARENT_PROXY_CONTRACTS,
} from "./constants";
import { zkSyncProvider } from "./providers";
import { TransactionEventHelper } from "./entity/transactionEvent";

// Block interval tp fetch proxy params
const BLOCK_INTERVAL = 10;

const lastImpls = new Map<string, string>();
const lastAdmins = new Map<string, string>();
const lastOwners = new Map<string, string>();
const isOssified = new Map<string, boolean>();

export const name = "ProxyWatcher";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  await Promise.all(
    LIDO_TRANSPARENT_PROXY_CONTRACTS.map(async (proxyInfo: LidoZkSyncProxy) => {
      const lastImpl = await getTransparentUpgradableProxyImpl(
        proxyInfo,
        currentBlock,
      );
      lastImpls.set(proxyInfo.proxyAddress, lastImpl);

      const lastAdmin = await getTransparentUpgradableProxyAdmin(
        proxyInfo,
        currentBlock,
      );
      lastAdmins.set(proxyInfo.proxyAddress, lastAdmin);

      const lastOwner = await getTransparentUpgradableProxyOwner(
        proxyInfo,
        currentBlock,
      );
      lastOwners.set(proxyInfo.proxyAddress, lastOwner);
    }),
  );

  await Promise.all(
    LIDO_OSSIFIABLE_PROXY_CONTRACTS.map(async (proxyInfo: LidoProxy) => {
      const lastImpl = await getProxyImpl(proxyInfo, currentBlock);
      lastImpls.set(proxyInfo.address, lastImpl);
      const lastAdmin = await getProxyAdmin(proxyInfo, currentBlock);
      lastAdmins.set(proxyInfo.address, lastAdmin);
      const IsOssified = await getIsOssified(proxyInfo, currentBlock);
      isOssified.set(proxyInfo.address, IsOssified);
    }),
  );

  return {
    lastImpls: JSON.stringify(Object.fromEntries(lastImpls)),
    lastAdmins: JSON.stringify(Object.fromEntries(lastAdmins)),
    lastOwner: JSON.stringify(Object.fromEntries(lastOwners)),
    IsOssified: JSON.stringify(Object.fromEntries(isOssified)),
  };
}

async function getTransparentUpgradableProxyImpl(
  proxyInfo: LidoZkSyncProxy,
  blockNumber: number,
) {
  const implFunc = proxyInfo.functions.get("implementation");
  if (!implFunc) {
    return undefined;
  }

  const proxy = new ethers.Contract(
    proxyInfo.proxyAdminAddress,
    proxyInfo.shortABI,
    zkSyncProvider,
  );

  return (
    await proxy.functions[implFunc](proxyInfo.proxyAddress, {
      blockTag: blockNumber,
    })
  )[0];
}

async function getTransparentUpgradableProxyAdmin(
  proxyInfo: LidoZkSyncProxy,
  blockNumber: number,
) {
  const adminFunc = proxyInfo.functions.get("admin");
  if (!adminFunc) {
    return undefined;
  }
  const proxy = new ethers.Contract(
    proxyInfo.proxyAdminAddress,
    proxyInfo.shortABI,
    zkSyncProvider,
  );

  return (
    await proxy.functions[adminFunc](proxyInfo.proxyAddress, {
      blockTag: blockNumber,
    })
  )[0];
}

async function getTransparentUpgradableProxyOwner(
  proxyInfo: LidoZkSyncProxy,
  blockNumber: number,
) {
  const ownerFunc = proxyInfo.functions.get("owner");
  if (!ownerFunc) {
    return undefined;
  }
  const proxy = new ethers.Contract(
    proxyInfo.proxyAdminAddress,
    proxyInfo.shortABI,
    zkSyncProvider,
  );

  return (await proxy.functions[ownerFunc]({ blockTag: blockNumber }))[0];
}

async function getProxyImpl(proxyInfo: LidoProxy, blockNumber: number) {
  const implFunc = proxyInfo.functions.get("implementation");
  if (!implFunc) {
    return undefined;
  }
  const proxy = new ethers.Contract(
    proxyInfo.address,
    proxyInfo.shortABI,
    zkSyncProvider,
  );
  return (await proxy.functions[implFunc]({ blockTag: blockNumber }))[0];
}

async function getProxyAdmin(proxyInfo: LidoProxy, blockNumber: number) {
  const adminFunc = proxyInfo.functions.get("admin");
  if (!adminFunc) {
    return undefined;
  }
  const proxy = new ethers.Contract(
    proxyInfo.address,
    proxyInfo.shortABI,
    zkSyncProvider,
  );
  return (await proxy.functions[adminFunc]({ blockTag: blockNumber }))[0];
}

async function getIsOssified(proxyInfo: LidoProxy, blockNumber: number) {
  const adminFunc = proxyInfo.functions.get("ossified");
  if (!adminFunc) {
    return undefined;
  }
  const proxy = new ethers.Contract(
    proxyInfo.address,
    proxyInfo.shortABI,
    zkSyncProvider,
  );
  return (await proxy.functions[adminFunc]({ blockTag: blockNumber }))[0];
}

export async function handleTransaction(logs: Log[], blocksDto: BlockDto[]) {
  const findings: Finding[] = [];

  handleProxyAdminEvents(logs, findings);

  return findings;
}

function handleProxyAdminEvents(logs: Log[], findings: Finding[]) {
  const addresses = logs.map((log) => log.address);

  PROXY_ADMIN_EVENTS.forEach((eventInfo) => {
    if (eventInfo.address in addresses) {
      const events = TransactionEventHelper.filterLog(
        logs,
        eventInfo.event,
        eventInfo.address,
      );
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

export async function handleBlock(blockDto: BlockDto) {
  const findings: Finding[] = [];

  await Promise.all([
    handleProxyImplementationChanges(blockDto, findings),
    handleProxyAdminChanges(blockDto, findings),
    handleProxyOwnerChanges(blockDto, findings),
    handleOssifiedChanges(blockDto, findings),
  ]);

  return findings;
}

async function handleProxyImplementationChanges(
  block: BlockDto,
  findings: Finding[],
) {
  if (block.number % BLOCK_INTERVAL == 0) {
    await Promise.all(
      LIDO_TRANSPARENT_PROXY_CONTRACTS.map(
        async (proxyInfo: LidoZkSyncProxy) => {
          const newImpl = await getTransparentUpgradableProxyImpl(
            proxyInfo,
            block.number,
          );
          const lastImpl = lastImpls.get(proxyInfo.proxyAddress) || "";
          if (newImpl != lastImpl) {
            findings.push(
              Finding.fromObject({
                name: "🚨 ZkSync: Proxy implementation changed",
                description:
                  `Proxy implementation for ${proxyInfo.name}(${proxyInfo.proxyAddress}) ` +
                  `was changed form ${lastImpl} to ${newImpl}` +
                  `\n(detected by func call)`,
                alertId: "PROXY-UPGRADED",
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
                metadata: { newImpl: newImpl, lastImpl: lastImpl },
              }),
            );
            lastImpls.set(proxyInfo.proxyAddress, newImpl);
          }
        },
      ),
    );

    await Promise.all(
      LIDO_OSSIFIABLE_PROXY_CONTRACTS.map(async (proxyInfo: LidoProxy) => {
        const newImpl = await getProxyImpl(proxyInfo, block.number);
        const lastImpl = lastImpls.get(proxyInfo.address) || "";
        if (newImpl != lastImpl) {
          findings.push(
            Finding.fromObject({
              name: "🚨 ZkSync: Proxy implementation changed",
              description:
                `Proxy implementation for ${proxyInfo.name}(${proxyInfo.address}) ` +
                `was changed form ${lastImpl} to ${newImpl}` +
                `\n(detected by func call)`,
              alertId: "PROXY-UPGRADED",
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
              metadata: { newImpl: newImpl, lastImpl: lastImpl },
            }),
          );
          lastImpls.set(proxyInfo.address, newImpl);
        }
      }),
    );
  }
}

async function handleProxyAdminChanges(
  blockDto: BlockDto,
  findings: Finding[],
) {
  if (blockDto.number % BLOCK_INTERVAL == 0) {
    await Promise.all(
      LIDO_TRANSPARENT_PROXY_CONTRACTS.map(
        async (proxyInfo: LidoZkSyncProxy) => {
          const newAdmin = await getTransparentUpgradableProxyAdmin(
            proxyInfo,
            blockDto.number,
          );
          const lastAdmin = lastAdmins.get(proxyInfo.proxyAddress) || "";
          if (newAdmin != lastAdmin) {
            findings.push(
              Finding.fromObject({
                name: "🚨 ZkSync: Proxy admin changed",
                description:
                  `Proxy admin for ${proxyInfo.name}(${proxyInfo.proxyAddress}) ` +
                  `was changed from ${lastAdmin} to ${newAdmin}` +
                  `\n(detected by func call)`,
                alertId: "PROXY-ADMIN-CHANGED",
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
                metadata: { newAdmin: newAdmin, lastAdmin: lastAdmin },
              }),
            );
            lastAdmins.set(proxyInfo.proxyAddress, newAdmin);
          }
        },
      ),
    );

    await Promise.all(
      LIDO_OSSIFIABLE_PROXY_CONTRACTS.map(async (proxyInfo: LidoProxy) => {
        const newAdmin = await getProxyAdmin(proxyInfo, blockDto.number);
        const lastAdmin = lastAdmins.get(proxyInfo.address) || "";
        if (newAdmin != lastAdmin) {
          findings.push(
            Finding.fromObject({
              name: "🚨 ZkSync: Proxy admin changed",
              description:
                `Proxy admin for ${proxyInfo.name}(${proxyInfo.address}) ` +
                `was changed from ${lastAdmin} to ${newAdmin}` +
                `\n(detected by func call)`,
              alertId: "PROXY-ADMIN-CHANGED",
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
              metadata: { newAdmin: newAdmin, lastAdmin: lastAdmin },
            }),
          );
          lastAdmins.set(proxyInfo.address, newAdmin);
        }
      }),
    );
  }
}

async function handleProxyOwnerChanges(
  blockDto: BlockDto,
  findings: Finding[],
) {
  if (blockDto.number % BLOCK_INTERVAL == 0) {
    await Promise.all(
      LIDO_TRANSPARENT_PROXY_CONTRACTS.map(
        async (proxyInfo: LidoZkSyncProxy) => {
          const newOwner = await getTransparentUpgradableProxyOwner(
            proxyInfo,
            blockDto.number,
          );
          const lastOwner = lastOwners.get(proxyInfo.proxyAddress) || "";
          if (newOwner != lastOwner) {
            findings.push(
              Finding.fromObject({
                name: "🚨 ZkSync: Proxy owner changed",
                description:
                  `Proxy owner for ${proxyInfo.name}(${proxyInfo.proxyAddress}) ` +
                  `was changed from ${lastOwner} to ${newOwner}` +
                  `\n(detected by func call)`,
                alertId: "PROXY-OWNER-CHANGED",
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
                metadata: { newOwner: newOwner, lastOwner: lastOwner },
              }),
            );
            lastOwners.set(proxyInfo.proxyAddress, newOwner);
          }
        },
      ),
    );
  }
}

async function handleOssifiedChanges(blockDto: BlockDto, findings: Finding[]) {
  if (blockDto.number % BLOCK_INTERVAL == 0) {
    await Promise.all(
      LIDO_OSSIFIABLE_PROXY_CONTRACTS.map(async (proxyInfo: LidoProxy) => {
        const newIsOssifiedValue = await getIsOssified(
          proxyInfo,
          blockDto.number,
        );
        const lastIsOssifiedValue = isOssified.get(proxyInfo.address) || "";
        if (newIsOssifiedValue != lastIsOssifiedValue) {
          findings.push(
            Finding.fromObject({
              name: "🚨 ZkSync: ossified is changed",
              description:
                `Proxy ossified for ${proxyInfo.name}(${proxyInfo.address}) ` +
                `was changed from ${lastIsOssifiedValue} to ${newIsOssifiedValue}` +
                `\n(detected by func call)`,
              alertId: "PROXY-OSSIFIED-CHANGED",
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
              metadata: {
                newIsOssified: newIsOssifiedValue,
                lastIsOssified: String(lastIsOssifiedValue),
              },
            }),
          );
          isOssified.set(proxyInfo.address, newIsOssifiedValue);
        }
      }),
    );
  }
}
