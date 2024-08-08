import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";
import {
  L1_BRIDGES,
  BridgeProxyInfo,
  LINEA_CUSTOM_CONTRACT_SET_EVENT,
  LINEA_L1_CROSS_DOMAIN_MESSENGER,
  L1_BRIDGES_PROXY_EVENTS,
  STETH_ADDRESS,
  THIRD_PARTY_PROXY_EVENTS,
  WSTETH_ADDRESS,
  BSC_L1_CROSS_CHAIN_CONTROLLER,
  BSC_CHAIN_ID,
} from "../constants";
import { ethersProvider } from "../ethers";
import {
  BaseAdapter__factory,
  CrossChainController__factory,
} from "../generated";

const lastImpls = new Map<string, string>();
const lastAdmins = new Map<string, string>();
export const bscAdapters = new Map<string, string>();

export const name = "ProxyWatcher";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  await Promise.all(
    L1_BRIDGES.map(async (proxyInfo: BridgeProxyInfo) => {
      const lastImpl = await getProxyImpl(proxyInfo, currentBlock);
      lastImpls.set(proxyInfo.address, lastImpl);
      const lastAdmin = await getProxyAdmin(proxyInfo, currentBlock);
      lastAdmins.set(proxyInfo.address, lastAdmin);
    }),
  );

  await setBridgeAdaptersNamesMap();

  return {
    lastImpls: JSON.stringify(Object.fromEntries(lastImpls)),
    lastAdmins: JSON.stringify(Object.fromEntries(lastAdmins)),
  };
}

async function setBridgeAdaptersNamesMap() {
  const cccContract = CrossChainController__factory.connect(
    BSC_L1_CROSS_CHAIN_CONTROLLER,
    ethersProvider,
  );
  const adapters =
    await cccContract.getForwarderBridgeAdaptersByChain(BSC_CHAIN_ID);

  for (const adapterAddress of adapters) {
    const bridgeAdapterContract = BaseAdapter__factory.connect(
      adapterAddress.currentChainBridgeAdapter,
      ethersProvider,
    );
    const adapterName = await bridgeAdapterContract.adapterName();
    bscAdapters.set(adapterAddress.currentChainBridgeAdapter, adapterName);
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleProxyAdminEvents(txEvent, findings);
  handleThirdPartyProxyAdminEvents(txEvent, findings);

  return findings;
}

function handleProxyAdminEvents(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  L1_BRIDGES_PROXY_EVENTS.forEach((eventInfo) => {
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

function handleThirdPartyProxyAdminEvents(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  THIRD_PARTY_PROXY_EVENTS.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        if (eventInfo.condition && !eventInfo.condition(event.args)) {
          return;
        }

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

  if (LINEA_L1_CROSS_DOMAIN_MESSENGER in txEvent.addresses) {
    const events = txEvent.filterLog(
      LINEA_CUSTOM_CONTRACT_SET_EVENT,
      LINEA_L1_CROSS_DOMAIN_MESSENGER,
    );
    events.forEach((event) => {
      if (event.args.nativeToken == WSTETH_ADDRESS) {
        findings.push(
          Finding.fromObject({
            name: "🚨 Linea: Custom contract set changed",
            description: `Linea native bridge gateway for wstETH changed to: ${event.args.gateway}`,
            alertId: "LINEA-WSTETH-GATEWAY-CHANGED",
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
            metadata: { args: String(event.args) },
          }),
        );
      }

      if (event.args.nativeToken == STETH_ADDRESS) {
        findings.push(
          Finding.fromObject({
            name: "🚨 Linea: Custom contract set changed",
            description: `Linea native bridge gateway for stETH changed to: ${event.args.gateway}`,
            alertId: "LINEA-stETH-GATEWAY-CHANGED",
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
            metadata: { args: String(event.args) },
          }),
        );
      }
    });
  }
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleProxyImplementationChanges(blockEvent, findings),
    handleProxyAdminChanges(blockEvent, findings),
  ]);

  return findings;
}

async function getProxyImpl(proxyInfo: BridgeProxyInfo, blockNumber: number) {
  const implFunc = proxyInfo.functions.get("implementation");
  if (!implFunc) {
    return undefined;
  }

  if (proxyInfo.proxyAdminAddress === null) {
    const proxy = new ethers.Contract(
      proxyInfo.address,
      proxyInfo.shortABI,
      ethersProvider,
    );

    return (await proxy.functions[implFunc]({ blockTag: blockNumber }))[0];
  }

  const proxy = new ethers.Contract(
    proxyInfo.proxyAdminAddress,
    proxyInfo.shortABI,
    ethersProvider,
  );

  return (
    await proxy.functions[implFunc](proxyInfo.address, {
      blockTag: blockNumber,
    })
  )[0];
}

async function handleProxyImplementationChanges(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  await Promise.all(
    L1_BRIDGES.map(async (proxyInfo: BridgeProxyInfo) => {
      const newImpl = await getProxyImpl(proxyInfo, blockEvent.blockNumber);
      const lastImpl = lastImpls.get(proxyInfo.address) || "";
      if (newImpl != lastImpl) {
        findings.push(
          Finding.fromObject({
            name: "🚨 L2 bridge (L1 side): Proxy implementation changed",
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

async function getProxyAdmin(proxyInfo: BridgeProxyInfo, blockNumber: number) {
  const adminFunc = proxyInfo.functions.get("admin");
  if (!adminFunc) {
    return undefined;
  }
  if (proxyInfo.proxyAdminAddress === null) {
    const proxy = new ethers.Contract(
      proxyInfo.address,
      proxyInfo.shortABI,
      ethersProvider,
    );

    return (await proxy.functions[adminFunc]({ blockTag: blockNumber }))[0];
  }

  const proxy = new ethers.Contract(
    proxyInfo.proxyAdminAddress,
    proxyInfo.shortABI,
    ethersProvider,
  );

  return (
    await proxy.functions[adminFunc](proxyInfo.address, {
      blockTag: blockNumber,
    })
  )[0];
}

async function handleProxyAdminChanges(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  await Promise.all(
    L1_BRIDGES.map(async (proxyInfo: BridgeProxyInfo) => {
      const newAdmin = await getProxyAdmin(proxyInfo, blockEvent.blockNumber);
      const lastAdmin = lastAdmins.get(proxyInfo.address) || "";
      if (newAdmin != lastAdmin) {
        findings.push(
          Finding.fromObject({
            name: "🚨 L2 bridge (L1 side): Proxy admin changed",
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
