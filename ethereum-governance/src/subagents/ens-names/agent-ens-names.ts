import BigNumber from "bignumber.js";

import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import ENS_BASE_REGISTRAR_ABI from "../../abi/ENS.json";

import { ONE_MONTH, ONE_WEEK } from "../../common/constants";

import { RedefineMode, requireWithTier } from "../../common/utils";
import type * as Constants from "./constants";

export const name = "EnsNames";

const { ENS_BASE_REGISTRAR_ADDRESS, ENS_CHECK_INTERVAL, LIDO_ENS_NAMES } =
  requireWithTier<typeof Constants>(module, "./constants", RedefineMode.Merge);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await handleEnsNamesExpiration(blockEvent, findings);

  return findings;
}

async function handleEnsNamesExpiration(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  if (blockEvent.blockNumber % ENS_CHECK_INTERVAL == 0) {
    const ens = new ethers.Contract(
      ENS_BASE_REGISTRAR_ADDRESS,
      ENS_BASE_REGISTRAR_ABI,
      ethersProvider,
    );
    await Promise.all(
      LIDO_ENS_NAMES.map(async (name) => {
        const labelHash = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(name),
        );
        const tokenId = ethers.BigNumber.from(labelHash).toString();
        const expires = new BigNumber(
          String(await ens.functions.nameExpires(tokenId)),
        ).toNumber();
        const leftSec = expires - blockEvent.block.timestamp;
        if (leftSec < ONE_MONTH) {
          const left = leftSec > ONE_WEEK * 2 ? "month" : "2 weeks";
          const severity =
            leftSec > ONE_WEEK * 2
              ? FindingSeverity.High
              : FindingSeverity.Critical;
          findings.push(
            Finding.fromObject({
              name: "⚠️ ENS: Domain expires soon",
              description: `Domain rent for ${name}.eth expires in less than a ${left}`,
              alertId: "ENS-RENT-EXPIRES",
              severity: severity,
              type: FindingType.Info,
            }),
          );
        }
      }),
    );
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
