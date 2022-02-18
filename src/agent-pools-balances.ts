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

import { POOLS_PARAMS, WSTETH_TOKEN_ADDRESS } from "./constants";

import CURVE_POOL_ABI from "./abi/CurrvePool.json";
import BALANCER_POOL_ABI from "./abi/BalancerPool.json";
import WSTETH_TOKEN_ABI from "./abi/wstEthToken.json";

export const name = "PoolsBalances";

//! Don't report if time passed since report moment is greater than REPORT_WINDOW
const REPORT_WINDOW = 60 * 60 * 24 * 7; // 1 week

const imbalanceTolerance = 10;
const imbalanceChangeTolerance = 5;

interface IPoolParams {
  lastReported: number;
  lastReportedImbalance: number;
  poolSize: number;
}

let poolsParams: { [name: string]: IPoolParams } = {
  Curve: {
    lastReported: 0,
    lastReportedImbalance: 0,
    poolSize: 0,
  },
  Balancer: {
    lastReported: 0,
    lastReportedImbalance: 0,
    poolSize: 0,
  },
};

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`Start initialisation of [${name}]`);

  // get initial Balancer Poll size
  const balancerPoolTokens = await getBalancerPoolTokens();
  poolsParams.Balancer.poolSize = balancerPoolTokens[0] + balancerPoolTokens[1];

  // get initial Curve Poll size
  const curvePoolTokens = await getCurvePoolTokens();
  poolsParams.Curve.poolSize = curvePoolTokens[0] + curvePoolTokens[1];

  // get initial Balancer Poll size
  poolsParams.Balancer.lastReportedImbalance =
    await balancerPoolImbalancePercent();

  // get initial Curve Poll size
  poolsParams.Curve.lastReportedImbalance = await curvePoolImbalancePercent();

  console.log(`Initialisation of [${name}] is done`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleCurvePoolImbalance(blockEvent, findings),
    handleBalancerPoolImbalance(blockEvent, findings),
    handleBalancerPoolSize(blockEvent, findings),
    handleCurvePoolSize(blockEvent, findings),
  ]);

  return findings;
}

function alreadyReported(poolParams: IPoolParams, now: number) {
  return poolParams.lastReported + REPORT_WINDOW >= now;
}

async function handleCurvePoolImbalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  let poolParams = poolsParams.Curve;
  const curveImbalance = await curvePoolImbalancePercent();
  if (!alreadyReported(poolParams, now)) {
    if (curveImbalance > imbalanceTolerance) {
      findings.push(
        Finding.fromObject({
          name: "Curve Pool is imbalanced",
          description: `There are ${curveImbalance.toFixed(
            2
          )}% more of the stETH than ETH in the pool`,
          alertId: "CURVE_POOL_IMBALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReported = now;
      poolParams.lastReportedImbalance = curveImbalance;
    } else if (curveImbalance < -imbalanceTolerance) {
      findings.push(
        Finding.fromObject({
          name: "Curve Pool is imbalanced",
          description: `There are ${curveImbalance.toFixed(
            2
          )}% more of the ETH than stETH in the pool`,
          alertId: "CURVE_POOL_IMBALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReported = now;
      poolParams.lastReportedImbalance = curveImbalance;
    }
  }
  if (
    Math.abs(curveImbalance - poolParams.lastReportedImbalance) >
    imbalanceChangeTolerance
  ) {
    findings.push(
      Finding.fromObject({
        name: "Curve Pool rapid imbalance change",
        description: `Curve Pool imblanace has changed from ${poolParams.lastReportedImbalance.toFixed(
          2
        )}% to ${curveImbalance.toFixed(
          2
        )}% since the last alert!`,
        alertId: "CURVE_POOL_IMBALANCE_RAPID_CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
    poolParams.lastReported = now;
    poolParams.lastReportedImbalance = curveImbalance;
  }
}

async function getCurvePoolTokens() {
  const curveStableSwap = new ethers.Contract(
    POOLS_PARAMS.Curve.poolContractAddress,
    CURVE_POOL_ABI,
    ethersProvider
  );
  const ethBalance = await curveStableSwap.functions.balances(0);
  const stethBalance = await curveStableSwap.functions.balances(1);
  return [ethBalance, stethBalance];
}

async function curvePoolImbalancePercent() {
  // Value between -100 (only ETH in pool) to 100 (only stETH in pool).
  const [ethBalance, stethBalance] = await getCurvePoolTokens();
  return calcImbalance(ethBalance, stethBalance);
}

async function handleCurvePoolSize(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  let poolParams = poolsParams.Curve;
  const poolTokens = await getCurvePoolTokens();
  const poolSize = poolTokens[0] + poolTokens[1];
  const poolSizeChange = calcImbalance(poolSize, poolParams.poolSize);
  if (poolSizeChange > 3) {
    findings.push(
      Finding.fromObject({
        name: "Significant Curve Pool size change",
        description: `Curve Pool size has increased by ${poolSizeChange.toFixed(
          2
        )} percents since last block`,
        alertId: "CURVE_POOL_SIZE_CHANGE",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
  } else if (poolSizeChange < -3) {
    findings.push(
      Finding.fromObject({
        name: "Significant Curve Pool size change",
        description: `Curve Pool size has decreased by ${-poolSizeChange.toFixed(
          2
        )} percents since last block`,
        alertId: "CURVE_POOL_SIZE_CHANGE",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
  }
  poolParams.poolSize = poolSize;
}

async function handleBalancerPoolImbalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  let poolParams = poolsParams.Balancer;
  const balancerImbalance = await balancerPoolImbalancePercent();
  if (!alreadyReported(poolParams, now)) {
    if (balancerImbalance > imbalanceTolerance) {
      findings.push(
        Finding.fromObject({
          name: "Balancer Pool is imbalanced",
          description: `There are ${balancerImbalance.toFixed(
            2
          )}$ more of the wstETH (recounted to stETH) than ETH in the pool`,
          alertId: "BALANCER_POOL_IMBALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReported = now;
      poolParams.lastReportedImbalance = balancerImbalance;
    } else if (balancerImbalance < -imbalanceTolerance) {
      findings.push(
        Finding.fromObject({
          name: "Balancer Pool is imbalanced",
          description: `There are ${balancerImbalance.toFixed(
            2
          )}$ more of the ETH than wstETH (recounted to stETH) in the pool`,
          alertId: "BALANCER_POOL_IMBALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReported = now;
      poolParams.lastReportedImbalance = balancerImbalance;
    }
  }
  if (
    Math.abs(balancerImbalance - poolParams.lastReportedImbalance) >
    imbalanceChangeTolerance
  ) {
    findings.push(
      Finding.fromObject({
        name: "Balancer Pool rapid imbalance change",
        description: `Balancer Pool imblanace has changed from ${poolParams.lastReportedImbalance.toFixed(
          2
        )}% to ${balancerImbalance.toFixed(
          2
        )}% since the last alert!`,
        alertId: "BALANCER_POOL_IMBALANCE_RAPID_CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
    poolParams.lastReported = now;
    poolParams.lastReportedImbalance = balancerImbalance;
  }
}

async function getBalancerPoolTokens() {
  const balancerValut = new ethers.Contract(
    POOLS_PARAMS.Balancer.valutContractAddress,
    BALANCER_POOL_ABI,
    ethersProvider
  );
  const poolTokens = await balancerValut.functions.getPoolTokens(
    POOLS_PARAMS.Balancer.poolId
  );
  return poolTokens.balances;
}

async function balancerPoolImbalancePercent() {
  // Value between -100 (only ETH in pool) to 100 (only wstETH in pool).
  // Note wstETH is not rebasable so it is not bounded to ETH 1:1
  // to count imbalance we accuire current wstETH to stETH relation
  const [wstethBalance, ethBalance] = await getBalancerPoolTokens();

  const wstETH = new ethers.Contract(
    WSTETH_TOKEN_ADDRESS,
    WSTETH_TOKEN_ABI,
    ethersProvider
  );
  const stethBalance = await wstETH.functions.getStETHByWstETH(wstethBalance);
  return calcImbalance(ethBalance, stethBalance);
}

function calcImbalance(balance1: number, balance2: number) {
  if (balance2 >= balance1) {
    return (balance2 / balance1 - 1) * 100;
  } else {
    return -(balance1 / balance2 - 1) * 100;
  }
}

async function handleBalancerPoolSize(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  let poolParams = poolsParams.Balancer;
  const poolTokens = await getBalancerPoolTokens();
  const poolSize = poolTokens[0] + poolTokens[1];
  const poolSizeChange = calcImbalance(poolSize, poolParams.poolSize);
  if (poolSizeChange > 3) {
    findings.push(
      Finding.fromObject({
        name: "Significant Balancer Pool size change",
        description: `Balancer Pool size has increased by ${poolSizeChange.toFixed(
          2
        )} percents since last block`,
        alertId: "BALANCER_POOL_SIZE_CHANGE",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
  } else if (poolSizeChange < -3) {
    findings.push(
      Finding.fromObject({
        name: "Significant Balancer Pool size change",
        description: `Balancer Pool size has decreased by ${-poolSizeChange.toFixed(
          2
        )} percents since last block`,
        alertId: "BALANCER_POOL_SIZE_CHANGE",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
  }
  poolParams.poolSize = poolSize;
}
