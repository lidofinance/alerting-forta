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

import LIDO_DAO_ABI from "./abi/LidoDAO.json";
import ASTETH_ABI from "./abi/astETH.json";
import STABLE_DEBT_STETH_ABI from "./abi/stableDebtStETH.json";
import VARIABLE_DEBT_STETH_ABI from "./abi/variableDebtStETH.json";

import {
  LIDO_DAO_ADDRESS,
  AAVE_ASTETH_ADDRESS,
  AAVE_STABLE_DEBT_STETH_ADDRESS,
  AAVE_VARIABLE_DEBT_STETH_ADDRESS,
  GWEI_DECIMALS,
  ASTETH_GWEI_DIFFERENCE_THRESHOLD,
} from "./constants";

export const name = "AAVE";

// 12 hours
const REPORT_WINDOW = 60 * 60 * 12;
let lastReportedAstEthSupply = 0;
let lastReportedStableStEthSupply = 0;
let lastReportedVariableStEthSupply = 0;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleAstEthSupply(blockEvent, findings),
    handleStableStEthSupply(blockEvent, findings),
    handleVariableStEthSupply(blockEvent, findings),
  ]);

  return findings;
}

async function handleAstEthSupply(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  if (lastReportedAstEthSupply + REPORT_WINDOW < now) {
    const stETH = new ethers.Contract(
      LIDO_DAO_ADDRESS,
      LIDO_DAO_ABI,
      ethersProvider
    );
    const astETH = new ethers.Contract(
      AAVE_ASTETH_ADDRESS,
      ASTETH_ABI,
      ethersProvider
    );

    const astEthBalance = new BigNumber(
      String(await stETH.functions.balanceOf(AAVE_ASTETH_ADDRESS, {blockTag: blockEvent.blockNumber}))
    );
    const astEthTotalSupply = new BigNumber(
      String(await astETH.functions.totalSupply({blockTag: blockEvent.blockNumber}))
    );

    const difference = astEthBalance.minus(astEthTotalSupply).abs();

    if (difference.isGreaterThan(ASTETH_GWEI_DIFFERENCE_THRESHOLD)) {
      findings.push(
        Finding.fromObject({
          name: "astETH balance and totalSupply difference",
          description: `stETH.balanceOf(${AAVE_ASTETH_ADDRESS})=${
            astEthBalance.div(GWEI_DECIMALS).toFixed()
          } gwei differs from astETH.totalSupply = ${
            astEthTotalSupply.div(GWEI_DECIMALS).toFixed()
          } gwei by ${difference} gwei`,
          alertId: "ASTETH-BALANCE-AND-SUPPLY-DIFFERENCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedAstEthSupply = now;
    }
  }
}

async function handleStableStEthSupply(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedStableStEthSupply + REPORT_WINDOW < now) {
    const stableDebtStEth = new ethers.Contract(
      AAVE_STABLE_DEBT_STETH_ADDRESS,
      STABLE_DEBT_STETH_ABI,
      ethersProvider
    );

    const stableDebtStEthTotalSupply = new BigNumber(
      String(await stableDebtStEth.functions.totalSupply())
    );

    if (stableDebtStEthTotalSupply.isGreaterThan(0)) {
      findings.push(
        Finding.fromObject({
          name: "stableDebtStETH totalSupply is not 0",
          description: `stableDebtStETH totalSupply is ${stableDebtStEthTotalSupply.toFixed()}`,
          alertId: "STABLE-DEBT-STETH-SUPPLY",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedStableStEthSupply = now;
    }
  }
}

async function handleVariableStEthSupply(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedVariableStEthSupply + REPORT_WINDOW < now) {
    const variableDebtStEth = new ethers.Contract(
      AAVE_VARIABLE_DEBT_STETH_ADDRESS,
      VARIABLE_DEBT_STETH_ABI,
      ethersProvider
    );

    const variableDebtStEthTotalSupply = new BigNumber(
      String(await variableDebtStEth.functions.totalSupply())
    );

    if (variableDebtStEthTotalSupply.isGreaterThan(0)) {
      findings.push(
        Finding.fromObject({
          name: "variableDebtStETH totalSupply is not 0",
          description: `variableDebtStETH totalSupply is ${variableDebtStEthTotalSupply.toFixed()}`,
          alertId: "VARIABLE-DEBT-STETH-SUPPLY",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedVariableStEthSupply = now;
    }
  }
}
