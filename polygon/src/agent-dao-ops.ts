import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "./ethers";

import MATIC_ABI from "./abi/MaticToken.json";
import ST_MATIC_ABI from "./abi/stMaticToken.json";
import {
  MATIC_TOKEN_ADDRESS,
  ST_MATIC_TOKEN_ADDRESS,
  FULL_24_HOURS,
  MATIC_DECIMALS,
  MAX_BUFFERED_MATIC_DAILY_PERCENT,
  MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT,
} from "./constants";

export const name = "DaoOps";

// 4 hours
const REPORT_WINDOW_BUFFERED_MATIC = 60 * 60 * 4;

let lastReportedBufferedMatic = 0;
let timeHighPooledMaticStart = 0;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleBufferedMatic(blockEvent, findings)]);

  return findings;
}

async function handleBufferedMatic(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedBufferedMatic + REPORT_WINDOW_BUFFERED_MATIC < now) {
    const matic = new ethers.Contract(
      MATIC_TOKEN_ADDRESS,
      MATIC_ABI,
      ethersProvider
    );

    const stMatic = new ethers.Contract(
      ST_MATIC_TOKEN_ADDRESS,
      ST_MATIC_ABI,
      ethersProvider
    );

    const bufferedMatic = new BigNumber(
      String(
        await matic.functions
          .balanceOf(ST_MATIC_TOKEN_ADDRESS, {
            blockTag: blockEvent.block.number,
          })
          .then((value) => new BigNumber(String(value)))
          .then((value) => value.div(MATIC_DECIMALS))
      )
    );

    const totalPooledMatic = new BigNumber(
      String(
        await stMatic.functions
          .getTotalPooledMatic({
            blockTag: blockEvent.block.number,
          })
          .then((value) => new BigNumber(String(value)))
          .then((value) => value.div(MATIC_DECIMALS))
      )
    );

    if (
      bufferedMatic.isGreaterThanOrEqualTo(
        totalPooledMatic.div(100).times(MAX_BUFFERED_MATIC_DAILY_PERCENT)
      )
    ) {
      timeHighPooledMaticStart =
        timeHighPooledMaticStart != 0 ? timeHighPooledMaticStart : now;
    } else {
      timeHighPooledMaticStart = 0;
    }

    if (
      bufferedMatic.isGreaterThanOrEqualTo(
        totalPooledMatic.div(100).times(MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT)
      )
    ) {
      findings.push(
        Finding.fromObject({
          name: "Huge buffered ETH amount",
          description: `There are ${bufferedMatic.toFixed(
            4
          )} (more that ${MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT}% of total pooled MATIC) buffered MATIC in stMATIC contract`,
          alertId: "HUGE-BUFFERED-MATIC",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBufferedMatic = now;
    } else if (
      timeHighPooledMaticStart != 0 &&
      now - timeHighPooledMaticStart > FULL_24_HOURS
    ) {
      findings.push(
        Finding.fromObject({
          name: "High buffered ETH amount",
          description: `There are ${bufferedMatic.toFixed(
            4
          )} (more that ${MAX_BUFFERED_MATIC_DAILY_PERCENT}% of total pooled MATIC) buffered MATIC in stMATIC contract for more than ${Math.floor(
            (now - timeHighPooledMaticStart) / (60 * 60)
          )} hours`,
          alertId: "HIGH-BUFFERED-MATIC",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBufferedMatic = now;
    }
  }
}
