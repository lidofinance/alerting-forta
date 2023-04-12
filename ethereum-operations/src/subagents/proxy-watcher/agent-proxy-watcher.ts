import {
  ethers,
  BlockEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "../../ethers";
import * as _constants from "./constants";
import { requireConstants } from "../../common/utils";
import { IProxyContractData } from "../../common/constants";

export const name = "ProxyWatcher";

export let constants: typeof _constants;
try {
  constants = requireConstants(`${module.path}/constants`);
} catch (e: any) {
  if (e?.code == "MODULE_NOT_FOUND") {
    // Do nothing. `constants` will be undefined and sub-agent will be disabled
  } else {
    throw e;
  }
}

let prevProxyImplementations: Map<string, string> = new Map<string, string>();

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  await Promise.all(
    Array.from(constants.LIDO_PROXY_CONTRACTS_DATA.keys()).map(
      async (address: any) => {
        const data = constants.LIDO_PROXY_CONTRACTS_DATA.get(address);
        if (data) {
          prevProxyImplementations.set(
            address,
            String(await getProxyImplementation(address, data, currentBlock))
          );
        }
      }
    )
  );

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleProxyImplementations(blockEvent, findings)]);

  return findings;
}

async function handleProxyImplementations(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  await Promise.all(
    Array.from(constants.LIDO_PROXY_CONTRACTS_DATA.keys()).map(
      async (address: any) => {
        const data = constants.LIDO_PROXY_CONTRACTS_DATA.get(address);
        if (data) {
          const prevImpl = prevProxyImplementations.get(address);
          const currentImpl = String(
            await getProxyImplementation(address, data, blockEvent.blockNumber)
          );
          if (prevImpl != currentImpl) {
            findings.push(
              Finding.fromObject({
                name: `🚨 Proxy implementation changed`,
                description: `Implementation of ${data.name} (${address}) changed from ${prevImpl} to ${currentImpl}`,
                alertId: `PROXY-IMPL-CHANGED`,
                severity: FindingSeverity.Critical,
                type: FindingType.Info,
              })
            );
          }
          prevProxyImplementations.set(address, currentImpl);
        }
      }
    )
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
  return await proxyContract.functions.implementation({
    blockTag: currentBlock,
  });
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
