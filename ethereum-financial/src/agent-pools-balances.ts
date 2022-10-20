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
  POOLS_PARAMS_BALANCES,
  IMBALANCE_CHANGE_TOLERANCE,
  IMBALANCE_TOLERANCE,
  POOL_SIZE_CHANGE_TOLERANCE_INFO,
  POOL_SIZE_CHANGE_TOLERANCE_HIGH,
  POOLS_BALANCES_REPORT_WINDOW,
  ETH_DECIMALS,
  PEG_REPORT_INTERVAL,
  PEG_STEP,
  PEG_THRESHOLD,
  PEG_STEP_ALERT_MIN_VALUE,
  TOTAL_UNSTAKED_STETH_TOLERANCE,
  ONE_HOUR,
} from "./constants";

import CURVE_POOL_ABI from "./abi/CurvePool.json";
import CURVE_WETH_POOL_ABI from "./abi/CurveWethPool.json";
import BALANCER_POOL_ABI from "./abi/BalancerPool.json";

export const name = "PoolsBalances";

interface PoolParams {
  poolSize: BigNumber;
  lastReportedImbalance: number;
  lastReportedImbalanceTime: number;
  lastReportedImbalancePoolDetails: PoolDetails;
  poolDetails: PoolDetails;
}

interface PoolDetails {
  token1: PoolToken;
  token2: PoolToken;
}

interface PoolToken {
  name: string;
  amount: BigNumber;
}

let poolsParams: { [name: string]: PoolParams } = {
  Curve: {
    poolSize: new BigNumber(0),
    lastReportedImbalance: 0,
    lastReportedImbalanceTime: 0,
    lastReportedImbalancePoolDetails: {
      token1: {
        name: "ETH",
        amount: new BigNumber(0),
      },
      token2: {
        name: "stETH",
        amount: new BigNumber(0),
      },
    },
    poolDetails: {
      token1: {
        name: "ETH",
        amount: new BigNumber(0),
      },
      token2: {
        name: "stETH",
        amount: new BigNumber(0),
      },
    },
  },
  CurveWeth: {
    poolSize: new BigNumber(0),
    lastReportedImbalance: 0,
    lastReportedImbalanceTime: 0,
    lastReportedImbalancePoolDetails: {
      token1: {
        name: "ETH",
        amount: new BigNumber(0),
      },
      token2: {
        name: "stETH",
        amount: new BigNumber(0),
      },
    },
    poolDetails: {
      token1: {
        name: "WETH",
        amount: new BigNumber(0),
      },
      token2: {
        name: "stETH",
        amount: new BigNumber(0),
      },
    },
  },
  Balancer: {
    poolSize: new BigNumber(0),
    lastReportedImbalance: 0,
    lastReportedImbalanceTime: 0,
    lastReportedImbalancePoolDetails: {
      token1: {
        name: "ETH",
        amount: new BigNumber(0),
      },
      token2: {
        name: "stETH",
        amount: new BigNumber(0),
      },
    },
    poolDetails: {
      token1: {
        name: "ETH",
        amount: new BigNumber(0),
      },
      token2: {
        name: "wstETH",
        amount: new BigNumber(0),
      },
    },
  },
};

let lastReportedCurvePegTime = 0;
let lastReportedCurvePegVal = 0;
let lastReportedCurvePegLevel = 0;
let lastReportedUnstakedStEth = new BigNumber(0);
let lastReportedUnstakedStEthTime = 0;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const block = await ethersProvider.getBlock(currentBlock);
  const now = block.timestamp;

  // get initial Balancer Pool tokens amount
  const balancerPoolTokens = await getBalancerPoolTokens(currentBlock);
  poolsParams.Balancer.poolDetails.token1.amount = balancerPoolTokens[0];
  poolsParams.Balancer.poolDetails.token2.amount = balancerPoolTokens[1];
  poolsParams.Balancer.lastReportedImbalancePoolDetails.token1.amount =
    balancerPoolTokens[0];
  poolsParams.Balancer.lastReportedImbalancePoolDetails.token2.amount =
    balancerPoolTokens[1];
  poolsParams.Balancer.poolSize = balancerPoolTokens[0].plus(
    balancerPoolTokens[1]
  );

  // get initial Curve Pool tokens amount
  const curvePoolTokens = await getCurvePoolTokens(currentBlock);
  poolsParams.Curve.poolDetails.token1.amount = curvePoolTokens[0];
  poolsParams.Curve.poolDetails.token2.amount = curvePoolTokens[1];
  poolsParams.Curve.lastReportedImbalancePoolDetails.token1.amount =
    curvePoolTokens[0];
  poolsParams.Curve.lastReportedImbalancePoolDetails.token2.amount =
    curvePoolTokens[1];
  poolsParams.Curve.poolSize = curvePoolTokens[0].plus(curvePoolTokens[1]);

  // get initial CurveWETH Pool size
  const curveWethPoolTokens = await getCurveWETHPoolTokens(currentBlock);
  poolsParams.CurveWeth.poolDetails.token1.amount = curveWethPoolTokens[0];
  poolsParams.CurveWeth.poolDetails.token2.amount = curveWethPoolTokens[1];
  poolsParams.CurveWeth.poolSize = curveWethPoolTokens[0].plus(
    curveWethPoolTokens[1]
  );

  // get Balancer Pool imbalance 5 mins ago. If there already was an imbalance do not report on start
  const balancerPoolTokensPrev = await getBalancerPoolTokens(
    currentBlock - Math.ceil((5 * 60) / 13)
  );
  poolsParams.Balancer.lastReportedImbalance = calcImbalance(
    balancerPoolTokensPrev[0],
    balancerPoolTokensPrev[1]
  );
  if (
    Math.abs(poolsParams.Balancer.lastReportedImbalance) > IMBALANCE_TOLERANCE
  ) {
    poolsParams.Balancer.lastReportedImbalanceTime = now;
  }

  // get Curve Pool imbalance 5 mins ago. If there already was an imbalance do not report on start
  const curvePoolTokensPrev = await getCurvePoolTokens(
    currentBlock - Math.ceil((5 * 60) / 13)
  );
  poolsParams.Curve.lastReportedImbalance = calcImbalance(
    curvePoolTokensPrev[0],
    curvePoolTokensPrev[1]
  );
  if (Math.abs(poolsParams.Curve.lastReportedImbalance) > IMBALANCE_TOLERANCE) {
    poolsParams.Curve.lastReportedImbalanceTime = now;
  }

  lastReportedCurvePegVal = await getCurvePeg(currentBlock);
  // Division by 100 is required to normalize lastReportedCurvePegLevel to PEG_STEP
  lastReportedCurvePegLevel =
    Math.ceil(lastReportedCurvePegVal / PEG_STEP) / 100;
  lastReportedUnstakedStEth = getTotalUnstakedStEth();
  lastReportedUnstakedStEthTime = now;

  return {
    curveStEthPeg: lastReportedCurvePegVal.toFixed(4),
    curvePoolImbalance: poolsParams.Curve.lastReportedImbalance.toString(),
    curvePoolSize: poolsParams.Curve.poolSize.toFixed(),
    balancerPoolImbalance:
      poolsParams.Balancer.lastReportedImbalance.toString(),
    balancerPoolSize: poolsParams.Balancer.poolSize.toFixed(),
    totalUnstakedStEth: lastReportedUnstakedStEth.toFixed(),
  };
}

function getTotalUnstakedStEth() {
  const unstakedStEthCurve = poolsParams.Curve.poolDetails.token2.amount.minus(
    poolsParams.Curve.poolDetails.token1.amount
  );
  const unstakedStEthBalancer =
    poolsParams.Balancer.poolDetails.token2.amount.minus(
      poolsParams.Balancer.poolDetails.token1.amount
    );
  return unstakedStEthCurve.plus(unstakedStEthBalancer);
}

function calcChange(balancePrev: BigNumber, balanceCur: BigNumber) {
  return (balanceCur.div(balancePrev).toNumber() - 1) * 100;
}

function calcImbalance(balance1: BigNumber, balance2: BigNumber) {
  const totalSize = balance1.plus(balance2);
  const percent1 = balance1.div(totalSize).times(100);
  const percent2 = balance2.div(totalSize).times(100);
  return percent1.minus(percent2).toNumber();
}

function poolDetails(poolDetails: PoolDetails) {
  const token1Amount = poolDetails.token1.amount.div(ETH_DECIMALS);
  const token2Amount = poolDetails.token2.amount.div(ETH_DECIMALS);
  const totalSize = token1Amount.plus(token2Amount);
  return (
    `${poolDetails.token1.name} - ${token1Amount.toFixed(2)} ` +
    `(${token1Amount.div(totalSize).times(100).toFixed(2)}%)\n` +
    `${poolDetails.token2.name} - ${token2Amount.toFixed(2)} ` +
    `(${token2Amount.div(totalSize).times(100).toFixed(2)}%)`
  );
}

function alreadyReportedImbalance(poolParams: PoolParams, now: number) {
  return (
    poolParams.lastReportedImbalanceTime + POOLS_BALANCES_REPORT_WINDOW >= now
  );
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleCurvePoolImbalance(blockEvent, findings),
    handleBalancerPoolImbalance(blockEvent, findings),
    handleBalancerPoolSize(blockEvent, findings),
    handleCurvePoolSize(blockEvent, findings),
    handleCurveWethPoolSize(blockEvent, findings),
    handleCurvePeg(blockEvent, findings),
    handleUnstakedStEth(blockEvent, findings),
  ]);

  return findings;
}

///////// CURVE ////////////

async function getCurvePoolTokens(blockNumber?: number): Promise<BigNumber[]> {
  const curveStableSwap = new ethers.Contract(
    POOLS_PARAMS_BALANCES.Curve.poolContractAddress,
    CURVE_POOL_ABI,
    ethersProvider
  );
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }
  const ethBalance = new BigNumber(
    String(await curveStableSwap.functions.balances(0, overrides))
  );
  const stethBalance = new BigNumber(
    String(await curveStableSwap.functions.balances(1, overrides))
  );
  return [ethBalance, stethBalance];
}

async function handleCurvePoolImbalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  let poolParams = poolsParams.Curve;
  const [ethBalance, stEthBalance] = await getCurvePoolTokens(
    blockEvent.blockNumber
  );
  const curveImbalance = calcImbalance(ethBalance, stEthBalance);
  const prevPoolStateText = poolDetails(
    poolParams.lastReportedImbalancePoolDetails
  );
  poolParams.poolDetails.token1.amount = ethBalance;
  poolParams.poolDetails.token2.amount = stEthBalance;
  if (!alreadyReportedImbalance(poolParams, now)) {
    if (
      curveImbalance > IMBALANCE_TOLERANCE ||
      curveImbalance < -IMBALANCE_TOLERANCE
    ) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Curve Pool is imbalanced",
          description: `Current pool state:\n${poolDetails(
            poolParams.poolDetails
          )}`,
          alertId: "CURVE-POOL-IMBALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReportedImbalanceTime = now;
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
        name: "🚨 Curve Pool rapid imbalance change",
        description:
          `Prev reported pool sate:\n${prevPoolStateText}\n` +
          `Current pool state:\n${poolDetails(poolParams.poolDetails)}`,
        alertId: "CURVE-POOL-IMBALANCE-RAPID-CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
    poolParams.lastReportedImbalanceTime = now;
    poolParams.lastReportedImbalance = curveImbalance;
    poolParams.lastReportedImbalancePoolDetails.token1.amount = ethBalance;
    poolParams.lastReportedImbalancePoolDetails.token2.amount = stEthBalance;
  }
}

async function handleCurvePoolSize(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  let poolParams = poolsParams.Curve;
  const poolTokens = await getCurvePoolTokens(blockEvent.blockNumber);
  const poolSize = poolTokens[0].plus(poolTokens[1]);
  const poolSizeChange = calcChange(poolParams.poolSize, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_INFO) {
    const severity =
      Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_HIGH
        ? FindingSeverity.High
        : FindingSeverity.Info;
    findings.push(
      Finding.fromObject({
        name: "⚠️ Significant Curve Pool size change",
        description: `Curve Pool size has ${
          poolSizeChange > 0
            ? "increased by " + poolSizeChange.toFixed(2).toString()
            : "decreased by " + -poolSizeChange.toFixed(2).toString()
        }% since the last block`,
        alertId: "CURVE-POOL-SIZE-CHANGE",
        severity: severity,
        type: FindingType.Info,
        metadata: {
          sizeBefore: poolParams.poolSize.toFixed(),
          sizeAfter: poolSize.toFixed(),
        },
      })
    );
  }
  poolParams.poolSize = poolSize;
}

///////// BALANCER ////////////

async function getBalancerPoolTokens(
  blockNumber?: number
): Promise<BigNumber[]> {
  const balancerVault = new ethers.Contract(
    POOLS_PARAMS_BALANCES.Balancer.vaultContractAddress,
    BALANCER_POOL_ABI,
    ethersProvider
  );
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }
  const poolTokens = await balancerVault.functions.getPoolTokens(
    POOLS_PARAMS_BALANCES.Balancer.poolId,
    overrides
  );
  return [
    new BigNumber(String(poolTokens.balances[1])),
    new BigNumber(String(poolTokens.balances[0])),
  ];
}

async function handleBalancerPoolImbalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  let poolParams = poolsParams.Balancer;

  const [ethBalance, wstethBalance] = await getBalancerPoolTokens(
    blockEvent.blockNumber
  );
  const balancerImbalance = calcImbalance(ethBalance, wstethBalance);
  const prevPoolStateText = poolDetails(
    poolParams.lastReportedImbalancePoolDetails
  );
  poolParams.poolDetails.token1.amount = ethBalance;
  poolParams.poolDetails.token2.amount = wstethBalance;
  if (!alreadyReportedImbalance(poolParams, now)) {
    if (
      balancerImbalance > IMBALANCE_TOLERANCE ||
      balancerImbalance < -IMBALANCE_TOLERANCE
    ) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Balancer Pool is imbalanced",
          description: `Current pool state:\n${poolDetails(
            poolParams.poolDetails
          )}`,
          alertId: "BALANCER-POOL-IMBALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReportedImbalanceTime = now;
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
        name: "🚨 Balancer Pool rapid imbalance change",
        description:
          `Prev reported pool sate:\n${prevPoolStateText}\n` +
          `Current pool state:\n${poolDetails(poolParams.poolDetails)}`,
        alertId: "BALANCER-POOL-IMBALANCE-RAPID-CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
    poolParams.lastReportedImbalanceTime = now;
    poolParams.lastReportedImbalance = balancerImbalance;
    poolParams.lastReportedImbalancePoolDetails.token1.amount = ethBalance;
    poolParams.lastReportedImbalancePoolDetails.token2.amount = wstethBalance;
  }
}

async function handleBalancerPoolSize(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  let poolParams = poolsParams.Balancer;
  const poolTokens = await getBalancerPoolTokens(blockEvent.blockNumber);
  const poolSize = poolTokens[0].plus(poolTokens[1]);
  const poolSizeChange = calcChange(poolParams.poolSize, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_INFO) {
    const severity =
      Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_HIGH
        ? FindingSeverity.High
        : FindingSeverity.Info;
    findings.push(
      Finding.fromObject({
        name: "⚠️ Significant Balancer Pool size change",
        description: `Balancer Pool size has ${
          poolSizeChange > 0
            ? "increased by " + poolSizeChange.toFixed(2).toString()
            : "decreased by " + -poolSizeChange.toFixed(2).toString()
        }% since the last block`,
        alertId: "BALANCER-POOL-SIZE-CHANGE",
        severity: severity,
        type: FindingType.Info,
        metadata: {
          sizeBefore: poolParams.poolSize.toFixed(),
          sizeAfter: poolSize.toFixed(),
        },
      })
    );
  }
  poolParams.poolSize = poolSize;
}

///////// CURVE WETH ////////////

async function getCurveWETHPoolTokens(
  blockNumber?: number
): Promise<BigNumber[]> {
  const curvePool = new ethers.Contract(
    POOLS_PARAMS_BALANCES.CurveWethStEth.poolContractAddress,
    CURVE_WETH_POOL_ABI,
    ethersProvider
  );
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }
  const poolTokens = await curvePool.functions.get_balances(overrides);
  return poolTokens[0].map((el: any) => new BigNumber(String(el)));
}

async function handleCurveWethPoolSize(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  let poolParams = poolsParams.CurveWeth;
  const poolTokens = await getCurveWETHPoolTokens(blockEvent.blockNumber);
  const poolSize = poolTokens[0].plus(poolTokens[1]);
  const poolSizeChange = calcChange(poolParams.poolSize, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_INFO) {
    const severity =
      Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_HIGH
        ? FindingSeverity.High
        : FindingSeverity.Info;
    findings.push(
      Finding.fromObject({
        name: "⚠️ Significant Curve WETH/stETH Pool size change",
        description: `Curve WETH/stETH Pool size has ${
          poolSizeChange > 0
            ? "increased by " + poolSizeChange.toFixed(2).toString()
            : "decreased by " + -poolSizeChange.toFixed(2).toString()
        }% since the last block`,
        alertId: "CURVE-WETH-POOL-SIZE-CHANGE",
        severity: severity,
        type: FindingType.Info,
        metadata: {
          sizeBefore: poolParams.poolSize.toFixed(),
          sizeAfter: poolSize.toFixed(),
        },
      })
    );
  }
  poolParams.poolSize = poolSize;
}

///////// CURVE PEG ////////////

async function handleCurvePeg(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  const peg = await getCurvePeg(blockEvent.blockNumber);
  // Division by 100 is required to normalize pegLevel to PEG_STEP
  const pegLevel = Math.ceil(peg / PEG_STEP) / 100;
  // info on PEG decrease
  if (pegLevel < lastReportedCurvePegLevel && peg < PEG_STEP_ALERT_MIN_VALUE) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ stETH PEG on Curve decreased",
        description: `stETH PEG on Curve decreased to ${peg.toFixed(4)}`,
        alertId: "STETH-CURVE-PEG-DECREASE",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: {
          peg: peg.toFixed(4),
        },
      })
    );
    lastReportedCurvePegVal = peg;
    lastReportedCurvePegLevel = pegLevel;
  }
  // ALERT on PEG lower threshold
  if (
    peg <= PEG_THRESHOLD &&
    now > lastReportedCurvePegTime + PEG_REPORT_INTERVAL
  ) {
    findings.push(
      Finding.fromObject({
        name: "🚨🚨🚨 Super low stETH PEG on Curve",
        description: `Current stETH PEG on Curve - ${peg.toFixed(4)}`,
        alertId: "LOW-STETH-CURVE-PEG",
        severity: FindingSeverity.Critical,
        type: FindingType.Degraded,
        metadata: {
          peg: peg.toFixed(4),
        },
      })
    );
    lastReportedCurvePegTime = now;
  }
  // update PEG vals if PEG goes way back
  if (lastReportedCurvePegLevel + PEG_STEP * 2 < pegLevel) {
    lastReportedCurvePegVal = peg;
    lastReportedCurvePegLevel = pegLevel;
  }
}

async function getCurvePeg(blockNumber: number) {
  const curveStableSwap = new ethers.Contract(
    POOLS_PARAMS_BALANCES.Curve.poolContractAddress,
    CURVE_POOL_ABI,
    ethersProvider
  );
  // 1000 stETH
  const amountStEth = new BigNumber(1000).times(ETH_DECIMALS);
  const amountEth = new BigNumber(
    String(
      await curveStableSwap.functions.get_dy(1, 0, amountStEth.toFixed(), {
        blockTag: blockNumber,
      })
    )
  );
  return amountEth.div(amountStEth).toNumber();
}

///////// "UNSTAKED" stETH ////////////

function handleUnstakedStEth(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  const newUnstakedStEth = getTotalUnstakedStEth();
  if (newUnstakedStEth.isGreaterThan(0)) {
    // if totalUnstakedStEth decreased by more than TOTAL_UNSTAKED_STETH_TOLERANCE% update last reported value
    if (
      newUnstakedStEth.isLessThan(
        lastReportedUnstakedStEth.times(
          1 - TOTAL_UNSTAKED_STETH_TOLERANCE / 100
        )
      )
    ) {
      lastReportedUnstakedStEth = newUnstakedStEth;
      lastReportedUnstakedStEthTime = now;
    }
    if (
      newUnstakedStEth.isGreaterThanOrEqualTo(
        lastReportedUnstakedStEth.times(
          1 + TOTAL_UNSTAKED_STETH_TOLERANCE / 100
        )
      )
    ) {
      const severity =
        now - lastReportedUnstakedStEthTime > ONE_HOUR
          ? FindingSeverity.Info
          : FindingSeverity.High;
      const time = Math.floor((now - lastReportedUnstakedStEthTime) / ONE_HOUR);
      findings.push(
        Finding.fromObject({
          name: "⚠️ Total 'unstaked' stETH increased",
          description:
            `Total unstaked stETH increased from ` +
            `${lastReportedUnstakedStEth.div(ETH_DECIMALS).toFixed(2)} stETH ` +
            `to ${newUnstakedStEth.div(ETH_DECIMALS).toFixed(2)} stETH ` +
            `over the last ${time} hours.\n` +
            `Note: Unstaked = difference of stETH(wstETH) and ETH amount in Curve and Balancer pools`,
          alertId: "TOTAL-UNSTAKED-STETH-INCREASED",
          severity: severity,
          type: FindingType.Info,
          metadata: {
            prevTotalUnstaked: lastReportedUnstakedStEth.toFixed(2),
            currentTotalUnstaked: newUnstakedStEth.toFixed(2),
            timePeriod: time.toFixed(),
          },
        })
      );
      lastReportedUnstakedStEth = newUnstakedStEth;
      lastReportedUnstakedStEthTime = now;
    }
  }
}
