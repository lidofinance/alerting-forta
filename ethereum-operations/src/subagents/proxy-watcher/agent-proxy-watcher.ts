import {
  ethers,
  BlockEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "../../ethers";
import {
  etherscanAddress,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import { IProxyContractData } from "../../common/constants";

export const name = "ProxyWatcher";

import type * as Constants from "./constants";
const { LIDO_PROXY_CONTRACTS_DATA } = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

let prevProxyImplementations: Map<string, string> = new Map<string, string>();
let initFindings: Finding[] = [];
let proxiesNoCode: string[] = [];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  await Promise.all(
    Array.from(LIDO_PROXY_CONTRACTS_DATA.keys()).map(async (address: any) => {
      const data = LIDO_PROXY_CONTRACTS_DATA.get(address);

      if (!(await isDeployed(address, currentBlock))) {
        initFindings.push(
          Finding.fromObject({
            name: "🚨 Proxy contract not found",
            description: `Proxy contract ${data?.name} (${etherscanAddress(
              address
            )}) not found`,
            alertId: "PROXY-NOT-FOUND",
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
          })
        );

        proxiesNoCode.push(address);
        return;
      }

      if (data) {
        prevProxyImplementations.set(
          address,
          String(await getProxyImplementation(address, data, currentBlock))
        );
      }
    })
  );

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = initFindings;

  await Promise.all([handleProxyImplementations(blockEvent, findings)]);

  if (initFindings.length > 0) {
    initFindings = [];
  }

  return findings;
}

async function handleProxyImplementations(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  await Promise.all(
    Array.from(LIDO_PROXY_CONTRACTS_DATA.keys()).map(async (address: any) => {
      if (proxiesNoCode.includes(address)) {
        return;
      }

      const data = LIDO_PROXY_CONTRACTS_DATA.get(address);

      if (!(await isDeployed(address, blockEvent.blockNumber))) {
        findings.push(
          Finding.fromObject({
            name: `🚨 Proxy contract selfdestructed`,
            description: `Proxy contract ${data?.name} (${etherscanAddress(
              address
            )}) selfdestructed`,
            alertId: `PROXY-SELFDESTRUCTED`,
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
          })
        );

        proxiesNoCode.push(address);
        return;
      }

      if (data) {
        const prevImpl = prevProxyImplementations.get(address);
        const currentImpl = String(
          await getProxyImplementation(address, data, blockEvent.blockNumber)
        );
        if (prevImpl != currentImpl) {
          findings.push(
            Finding.fromObject({
              name: `🚨 Proxy implementation changed`,
              description: `Implementation of ${data.name} (${etherscanAddress(
                address
              )}) changed from ${
                prevImpl ? etherscanAddress(prevImpl) : prevImpl
              } to ${etherscanAddress(currentImpl)}`,
              alertId: `PROXY-IMPL-CHANGED`,
              severity: FindingSeverity.Critical,
              type: FindingType.Info,
            })
          );
        }
        prevProxyImplementations.set(address, currentImpl);
      }
    })
  );
}

async function getProxyImplementation(
  address: string,
  data: IProxyContractData,
  currentBlock: number
): Promise<string> {
  const proxyContract = new ethers.Contract(
    address,
    data.shortABI,
    ethersProvider
  );
  if ("implementation" in proxyContract.functions) {
    return await proxyContract.functions.implementation({
      blockTag: currentBlock,
    });
  }
  if ("proxy__getImplementation" in proxyContract.functions) {
    return await proxyContract.functions.proxy__getImplementation({
      blockTag: currentBlock,
    });
  }
  throw new Error(
    `Proxy contract ${address} does not have "implementation" or "proxy__getImplementation" functions`
  );
}

async function isDeployed(
  address: string,
  blockNumber?: number
): Promise<boolean> {
  const code = await ethersProvider.getCode(address, blockNumber);
  return code !== "0x";
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
