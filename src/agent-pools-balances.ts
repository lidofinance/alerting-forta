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

import {
  POOLS_PARAMS,
  WSTETH_TOKEN_ADDRESS,
  IMBALANCE_CHANGE_TOLERANCE,
  IMBALANCE_TOLERANCE,
  POOL_SIZE_CHANGE_TOLERANCE_INFO,
  POOLS_BALANCES_REPORT_WINDOW,
} from "./constants";

import { capitalizeFirstLetter } from "./utils/tools";

import CURVE_POOL_ABI from "./abi/CurvePool.json";
import BALANCER_POOL_ABI from "./abi/BalancerPool.json";
import WSTETH_TOKEN_ABI from "./abi/wstEthToken.json";
import { POOL_SIZE_CHANGE_TOLERANCE_HIGH } from './constants';

export const name = "PoolsBalances";

interface IPoolParams {
  lastReported: number;
  lastReportedImbalance: number;
  poolSize: BigNumber;
}

let poolsParams: { [name: string]: IPoolParams } = {
  Curve: {
    lastReported: 0,
    lastReportedImbalance: 0,
    poolSize: new BigNumber(0),
  },
  Balancer: {
    lastReported: 0,
    lastReportedImbalance: 0,
    poolSize: new BigNumber(0),
  },
};

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`Start initialization of [${name}]`);

  const block = await ethersProvider.getBlock(currentBlock);
  const now = block.timestamp;

  // get initial Balancer Poll size
  const balancerPoolTokens = await getBalancerPoolTokens();
  poolsParams.Balancer.poolSize = BigNumber.sum.apply(null, balancerPoolTokens);

  // get initial Curve Poll size
  const curvePoolTokens = await getCurvePoolTokens();
  poolsParams.Curve.poolSize = BigNumber.sum.apply(null, curvePoolTokens);

  // get Balancer Poll imbalance 5 mins ago. If there already was an imbalance do not report on start
  poolsParams.Balancer.lastReportedImbalance =
    await balancerPoolImbalancePercent(currentBlock - Math.ceil((5 * 60) / 13));
  if (
    Math.abs(poolsParams.Balancer.lastReportedImbalance) > IMBALANCE_TOLERANCE
  ) {
    poolsParams.Balancer.lastReported = now;
  }

  // get Curve Poll imbalance 5 mins ago. If there already was an imbalance do not report on start
  poolsParams.Curve.lastReportedImbalance = await curvePoolImbalancePercent(
    currentBlock - Math.ceil((5 * 60) / 13)
  );
  if (Math.abs(poolsParams.Curve.lastReportedImbalance) > IMBALANCE_TOLERANCE) {
    poolsParams.Curve.lastReported = now;
  }

  console.log(`Initialization of [${name}] is done`);
  return {
    curvePoolSize: poolsParams.Curve.poolSize.toString(),
    balancerPoolSize: poolsParams.Balancer.poolSize.toString(),
    curvePoolImbalance: poolsParams.Curve.lastReportedImbalance.toString(),
    balancerPoolImbalance:
      poolsParams.Balancer.lastReportedImbalance.toString(),
  };
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

function imbalanceMessage(imbalance: number, token1: string, token2: string) {
  if (imbalance > 0) {
    return `there are ${imbalance.toFixed(
      2
    )}% more of ${token1} than ${token2} in the pool`;
  } else {
    return `there are ${-imbalance.toFixed(
      2
    )}% more of ${token2} than ${token1} in the pool`;
  }
}

function alreadyReported(poolParams: IPoolParams, now: number) {
  return poolParams.lastReported + POOLS_BALANCES_REPORT_WINDOW >= now;
}

async function handleCurvePoolImbalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  let poolParams = poolsParams.Curve;
  const curveImbalance = await curvePoolImbalancePercent();
  if (!alreadyReported(poolParams, now)) {
    if (
      curveImbalance > IMBALANCE_TOLERANCE ||
      curveImbalance < -IMBALANCE_TOLERANCE
    ) {
      findings.push(
        Finding.fromObject({
          name: "Curve Pool is imbalanced",
          description: capitalizeFirstLetter(
            imbalanceMessage(curveImbalance, "stETH", "ETH")
          ),
          alertId: "CURVE_POOL_IMBALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReported = now;
      poolParams.lastReportedImbalance = curveImbalance;
    }
  }
  let changeInt = [
    -1 * Math.sign(poolParams.lastReportedImbalance) * IMBALANCE_TOLERANCE,
    poolParams.lastReportedImbalance +
      IMBALANCE_CHANGE_TOLERANCE * Math.sign(poolParams.lastReportedImbalance),
  ];
  changeInt.sort((a, b) => a - b);
  if (curveImbalance < changeInt[0] || curveImbalance > changeInt[1]) {
    findings.push(
      Finding.fromObject({
        name: "Curve Pool rapid imbalance change",
        description: `Curve Pool imbalance has changed from ${imbalanceMessage(
          poolParams.lastReportedImbalance,
          "stETH",
          "ETH"
        )} to ${imbalanceMessage(
          curveImbalance,
          "stETH",
          "ETH"
        )} since the last alert!`,
        alertId: "CURVE_POOL_IMBALANCE_RAPID_CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
    poolParams.lastReported = now;
    poolParams.lastReportedImbalance = curveImbalance;
  }
}

async function getCurvePoolTokens(blockNumber?: number) {
  const curveStableSwap = new ethers.Contract(
    POOLS_PARAMS.Curve.poolContractAddress,
    CURVE_POOL_ABI,
    ethersProvider
  );
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }
  const ethBalance = new BigNumber(String(await curveStableSwap.functions.balances(0, overrides)));
  const stethBalance = new BigNumber(String(await curveStableSwap.functions.balances(1, overrides)));
  return [ethBalance, stethBalance];
}

async function curvePoolImbalancePercent(blockNumber?: number) {
  // Value between -100 (only ETH in pool) to 100 (only stETH in pool).
  const [ethBalance, stethBalance] = await getCurvePoolTokens(blockNumber);
  return calcImbalance(ethBalance, stethBalance);
}

async function handleCurvePoolSize(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  let poolParams = poolsParams.Curve;
  const poolTokens = await getCurvePoolTokens();
  const poolSize = BigNumber.sum.apply(null, poolTokens);
  const poolSizeChange = calcImbalance(poolParams.poolSize, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_INFO) {
    const severity = Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_HIGH ? FindingSeverity.High : FindingSeverity.Info
    findings.push(
      Finding.fromObject({
        name: "Significant Curve Pool size change",
        description: `Curve Pool size has ${
          poolSizeChange > 0
            ? "increased by " + poolSizeChange.toFixed(2).toString()
            : "decreased by " + -poolSizeChange.toFixed(2).toString()
        }% since the last block`,
        alertId: "CURVE_POOL_SIZE_CHANGE",
        severity: severity,
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
    if (
      balancerImbalance > IMBALANCE_TOLERANCE ||
      balancerImbalance < -IMBALANCE_TOLERANCE
    ) {
      findings.push(
        Finding.fromObject({
          name: "Balancer Pool is imbalanced",
          description: capitalizeFirstLetter(
            imbalanceMessage(
              balancerImbalance,
              "wstETH (recounted to stETH)",
              "ETH"
            )
          ),
          alertId: "BALANCER_POOL_IMBALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReported = now;
      poolParams.lastReportedImbalance = balancerImbalance;
    }
  }
  let changeInt = [
    -1 * Math.sign(poolParams.lastReportedImbalance) * IMBALANCE_TOLERANCE,
    poolParams.lastReportedImbalance +
      IMBALANCE_CHANGE_TOLERANCE * Math.sign(poolParams.lastReportedImbalance),
  ];
  changeInt.sort((a, b) => a - b);
  if (balancerImbalance < changeInt[0] || balancerImbalance > changeInt[1]) {
    findings.push(
      Finding.fromObject({
        name: "Balancer Pool rapid imbalance change",
        description: `Balancer Pool imbalance has changed from ${imbalanceMessage(
          poolParams.lastReportedImbalance,
          "wstETH (recounted to stETH)",
          "ETH"
        )} to ${imbalanceMessage(
          balancerImbalance,
          "wstETH (recounted to stETH)",
          "ETH"
        )} since the last alert!`,
        alertId: "BALANCER_POOL_IMBALANCE_RAPID_CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
    poolParams.lastReported = now;
    poolParams.lastReportedImbalance = balancerImbalance;
  }
}

async function getBalancerPoolTokens(blockNumber?: number) {
  const balancerVault = new ethers.Contract(
    POOLS_PARAMS.Balancer.vaultContractAddress,
    BALANCER_POOL_ABI,
    ethersProvider
  );
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }
  const poolTokens = await balancerVault.functions.getPoolTokens(
    POOLS_PARAMS.Balancer.poolId,
    overrides
  );
  return poolTokens.balances.map((el: any) => new BigNumber(String(el)));
}

async function balancerPoolImbalancePercent(blockNumber?: number) {
  // Value between -100 (only ETH in pool) to 100 (only wstETH in pool).
  // Note wstETH is not rebasable so it is not bounded to ETH 1:1
  // to count imbalance we acquire current wstETH to stETH relation
  const [wstethBalance, ethBalance] = await getBalancerPoolTokens(blockNumber);

  const wstETH = new ethers.Contract(
    WSTETH_TOKEN_ADDRESS,
    WSTETH_TOKEN_ABI,
    ethersProvider
  );
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }
  const stethBalance = new BigNumber(
    String(
      await wstETH.functions.getStETHByWstETH(
        wstethBalance.toFixed(),
        overrides
      )
    )
  );
  return calcImbalance(ethBalance, stethBalance);
}

function calcImbalance(balance1: BigNumber, balance2: BigNumber) {
  if (balance2 >= balance1) {
    return (balance2.div(balance1).toNumber() - 1) * 100;
  } else {
    return -(balance1.div(balance2).toNumber() - 1) * 100;
  }
}

async function handleBalancerPoolSize(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  let poolParams = poolsParams.Balancer;
  const poolTokens = await getBalancerPoolTokens();
  const poolSize = BigNumber.sum.apply(null, poolTokens);
  const poolSizeChange = calcImbalance(poolParams.poolSize, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_INFO) {
    const severity = Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_HIGH ? FindingSeverity.High : FindingSeverity.Info
    findings.push(
      Finding.fromObject({
        name: "Significant Balancer Pool size change",
        description: `Balancer Pool size has ${
          poolSizeChange > 0
            ? "increased by " + poolSizeChange.toFixed(2).toString()
            : "decreased by " + -poolSizeChange.toFixed(2).toString()
        }% since the last block`,
        alertId: "BALANCER_POOL_SIZE_CHANGE",
        severity: severity,
        type: FindingType.Info,
      })
    );
  }
  poolParams.poolSize = poolSize;
}
