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
  POOL_SIZE_CHANGE_TOLERANCE_HIGH,
  POOLS_BALANCES_REPORT_WINDOW,
  CHAINLINK_STETH_USD_PRICE_ADDRESS,
  PRICE_DIFFERENCE_THRESHOLD,
  LIDO_DAO_ADDRESS,
  DAI_TOKEN_ADDRESS,
} from "./constants";

import { capitalizeFirstLetter } from "./utils/tools";

import CURVE_POOL_ABI from "./abi/CurvePool.json";
import BALANCER_POOL_ABI from "./abi/BalancerPool.json";
import SUSHI_POOL_ABI from "./abi/SushiPool.json";
import SUSHI_ROUTER_ABI from "./abi/SushiRouter.json";
import WSTETH_TOKEN_ABI from "./abi/wstEthToken.json";
import CHAINLINK_STETH_USD_ABI from "./abi/ChainlinkStEthUsd.json";
import LIDO_ABI from "./abi/LidoDAO.json";
import DAI_ABI from "./abi/DaiToken.json"
import ONE_INCH_POOL_ABI from "./abi/1inchPool.json"

export const name = "PoolsBalances";

interface IPoolParams {
  lastReported: number;
  lastReportedImbalance: number;
  poolSize: IPoolSize;
}

interface IPoolSize {
  poolSizeTotal: BigNumber;
  poolSizeToken1: BigNumber;
  poolSizeToken2: BigNumber;
}

let poolsParams: { [name: string]: IPoolParams } = {
  Curve: {
    lastReported: 0,
    lastReportedImbalance: 0,
    poolSize: {
      poolSizeTotal: new BigNumber(0),
      poolSizeToken1: new BigNumber(0),
      poolSizeToken2: new BigNumber(0),
    }
  },
  Balancer: {
    lastReported: 0,
    lastReportedImbalance: 0,
    poolSize: {
      poolSizeTotal: new BigNumber(0),
      poolSizeToken1: new BigNumber(0),
      poolSizeToken2: new BigNumber(0),
    }
  },
  Sushi: {
    lastReported: 0,
    lastReportedImbalance: 0,
    poolSize: {
      poolSizeTotal: new BigNumber(0),
      poolSizeToken1: new BigNumber(0),
      poolSizeToken2: new BigNumber(0),
    }
  },
  OneInch: {
    lastReported: 0,
    lastReportedImbalance: 0,
    poolSize: {
      poolSizeTotal: new BigNumber(0),
      poolSizeToken1: new BigNumber(0),
      poolSizeToken2: new BigNumber(0),
    }
  },
};

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`Start initialization of [${name}]`);

  const block = await ethersProvider.getBlock(currentBlock);
  const now = block.timestamp;

  // get initial Balancer Pool size
  const balancerPoolTokens = await getBalancerPoolTokens();
  poolsParams.Balancer.poolSize.poolSizeTotal = BigNumber.sum.apply(null, balancerPoolTokens);

  // get initial Curve Pool size
  const curvePoolTokens = await getCurvePoolTokens();
  poolsParams.Curve.poolSize.poolSizeTotal = BigNumber.sum.apply(null, curvePoolTokens);

  //get Sushi pool size
  [poolsParams.Sushi.poolSize.poolSizeToken1, poolsParams.Sushi.poolSize.poolSizeToken2] = await getSushiTokens();

  //get OneInch pool size
  [poolsParams.OneInch.poolSize.poolSizeToken1, poolsParams.OneInch.poolSize.poolSizeToken2] = await getOneInchTokens();

  // get Balancer Pool imbalance 5 mins ago. If there already was an imbalance do not report on start
  poolsParams.Balancer.lastReportedImbalance =
    await balancerPoolImbalancePercent(currentBlock - Math.ceil((5 * 60) / 13));
  if (
    Math.abs(poolsParams.Balancer.lastReportedImbalance) > IMBALANCE_TOLERANCE
  ) {
    poolsParams.Balancer.lastReported = now;
  }

  // get Curve Pool imbalance 5 mins ago. If there already was an imbalance do not report on start
  poolsParams.Curve.lastReportedImbalance = await curvePoolImbalancePercent(
    currentBlock - Math.ceil((5 * 60) / 13)
  );
  if (Math.abs(poolsParams.Curve.lastReportedImbalance) > IMBALANCE_TOLERANCE) {
    poolsParams.Curve.lastReported = now;
  }

  console.log(`Initialization of [${name}] is done`);
  return {
    curvePoolSize: poolsParams.Curve.poolSize.poolSizeTotal.toString(),
    balancerPoolSize: poolsParams.Balancer.poolSize.poolSizeTotal.toString(),
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
    handleSushiPrice(blockEvent, findings),
    handleSushiPoolSize(blockEvent, findings),
    handleOneInchPrice(blockEvent, findings),
    handleOneInchPoolSize(blockEvent, findings),
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
          alertId: "CURVE-POOL-IMBALANCE",
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
        alertId: "CURVE-POOL-IMBALANCE-RAPID-CHANGE",
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
  const ethBalance = new BigNumber(
    String(await curveStableSwap.functions.balances(0, overrides))
  );
  const stethBalance = new BigNumber(
    String(await curveStableSwap.functions.balances(1, overrides))
  );
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
  const poolTokens = await getCurvePoolTokens(blockEvent.blockNumber);
  const poolSize = BigNumber.sum.apply(null, poolTokens);
  const poolSizeChange = calcImbalance(poolParams.poolSize.poolSizeTotal, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_INFO) {
    const severity =
      Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_HIGH
        ? FindingSeverity.High
        : FindingSeverity.Info;
    findings.push(
      Finding.fromObject({
        name: "Significant Curve Pool size change",
        description: `Curve Pool size has ${
          poolSizeChange > 0
            ? "increased by " + poolSizeChange.toFixed(2).toString()
            : "decreased by " + -poolSizeChange.toFixed(2).toString()
        }% since the last block`,
        alertId: "CURVE-POOL-SIZE-CHANGE",
        severity: severity,
        type: FindingType.Info,
      })
    );
  }
  poolParams.poolSize.poolSizeTotal = poolSize;
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
          alertId: "BALANCER-POOL-IMBALANCE",
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
        alertId: "BALANCER-POOL-IMBALANCE-RAPID-CHANGE",
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
  const poolTokens = await getBalancerPoolTokens(blockEvent.blockNumber);
  const poolSize = BigNumber.sum.apply(null, poolTokens);
  const poolSizeChange = calcImbalance(poolParams.poolSize.poolSizeTotal, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_INFO) {
    const severity =
      Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE_HIGH
        ? FindingSeverity.High
        : FindingSeverity.Info;
    findings.push(
      Finding.fromObject({
        name: "Significant Balancer Pool size change",
        description: `Balancer Pool size has ${
          poolSizeChange > 0
            ? "increased by " + poolSizeChange.toFixed(2).toString()
            : "decreased by " + -poolSizeChange.toFixed(2).toString()
        }% since the last block`,
        alertId: "BALANCER-POOL-SIZE-CHANGE",
        severity: severity,
        type: FindingType.Info,
      })
    );
  }
  poolParams.poolSize.poolSizeTotal = poolSize;
}

async function getSushiTokens(blockNumber?: number) {
  const sushiPool = new ethers.Contract(
    POOLS_PARAMS.Sushi.poolContractAddress,
    SUSHI_POOL_ABI,
    ethersProvider
  );

  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }

  const reserves = await sushiPool.functions.getReserves(overrides);
  const daiReserve = new BigNumber(String(reserves[0]));
  const wstEthReserve = new BigNumber(String(reserves[1]));

  return [daiReserve, wstEthReserve];
}

async function handleSushiPrice(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  let poolParams = poolsParams.Sushi;
  if (!alreadyReported(poolParams, now)) {
    const [daiReserve, wstEthReserve] = await getSushiTokens(blockEvent.blockNumber);

    // 0.1% of token supply in pool
    const wstEthTestAmount = wstEthReserve.idiv(1000);

    const sushiRouter = new ethers.Contract(
      POOLS_PARAMS.Sushi.routerContractAddress,
      SUSHI_ROUTER_ABI,
      ethersProvider
    );

    const daiTestAmount = new BigNumber(
      String(
        await sushiRouter.functions.getAmountIn(
          wstEthTestAmount.toFixed(),
          daiReserve.toFixed(),
          wstEthReserve.toFixed(),
          {blockTag: blockEvent.blockNumber}
        )
      )
    );

    const wstETH = new ethers.Contract(
      WSTETH_TOKEN_ADDRESS,
      WSTETH_TOKEN_ABI,
      ethersProvider
    );
    const stEthTestBalance = new BigNumber(
      String(
        await wstETH.functions.getStETHByWstETH(wstEthTestAmount.toFixed(), {blockTag: blockEvent.blockNumber})
      )
    );

    const wstEthPricePool = daiTestAmount.div(wstEthTestAmount);

    const chainlink = new ethers.Contract(
      CHAINLINK_STETH_USD_PRICE_ADDRESS,
      CHAINLINK_STETH_USD_ABI,
      ethersProvider
    );

    const stEthPrice = new BigNumber(
      String((await chainlink.functions.latestRoundData({blockTag: blockEvent.blockNumber}))[1])
    );
    const decimals = parseInt(String(await chainlink.functions.decimals({blockTag: blockEvent.blockNumber})));

    const wstEthPriceFeed = stEthPrice.div(10 ** decimals).times(stEthTestBalance).div(wstEthTestAmount);

    const priceDifference = wstEthPricePool
      .div(wstEthPriceFeed)
      .times(100)
      .minus(100)
      .toNumber();

    if (Math.abs(priceDifference) > PRICE_DIFFERENCE_THRESHOLD) {
      findings.push(
        Finding.fromObject({
          name: "Significant wstETH price difference between Sushi pool and chainlink feed",
          description: `wstETH price in pool (${wstEthPricePool.toFixed(2)}) is ${priceDifference.toFixed(2)}% ${priceDifference > 0 ? 'higher' : 'lower'} than chainlink feed (${wstEthPriceFeed.toFixed(2)})`,
          alertId: "BAD-SUSHI-PRICE",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReported = now;
    }
  }
}


async function handleSushiPoolSize(blockEvent: BlockEvent, findings: Finding[]) {
  let poolParams = poolsParams.Sushi;
  const [daiReserve, wstEthReserve] = await getSushiTokens();
  const poolSizeChangeDai = calcImbalance(poolParams.poolSize.poolSizeToken1, daiReserve);
  const poolSizeChangeWstEth = calcImbalance(poolParams.poolSize.poolSizeToken2, wstEthReserve);
  if (Math.abs(poolSizeChangeDai) > POOL_SIZE_CHANGE_TOLERANCE_HIGH) {
    findings.push(
      Finding.fromObject({
        name: "Significant Sushi Pool size change",
        description: `Sushi Pool size (DAI part) has ${
          poolSizeChangeDai > 0
            ? "increased by " + poolSizeChangeDai.toFixed(2).toString()
            : "decreased by " + -poolSizeChangeDai.toFixed(2).toString()
        }% since the last block`,
        alertId: "SUSHI-POOL-SIZE-CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      })
    );
  }
  if (Math.abs(poolSizeChangeWstEth) > POOL_SIZE_CHANGE_TOLERANCE_HIGH) {
    findings.push(
      Finding.fromObject({
        name: "Significant Sushi Pool size change",
        description: `Sushi Pool size (wstETH part) has ${
          poolSizeChangeWstEth > 0
            ? "increased by " + poolSizeChangeWstEth.toFixed(2).toString()
            : "decreased by " + -poolSizeChangeWstEth.toFixed(2).toString()
        }% since the last block`,
        alertId: "SUSHI-POOL-SIZE-CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      })
    );
  }
  poolParams.poolSize.poolSizeToken1 = daiReserve;
  poolParams.poolSize.poolSizeToken2 = wstEthReserve;
}


async function getOneInchTokens(blockNumber?: number) {
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }

  const sthETH = new ethers.Contract(
    LIDO_DAO_ADDRESS,
    LIDO_ABI,
    ethersProvider
  )

  const DAI = new ethers.Contract(
    DAI_TOKEN_ADDRESS,
    DAI_ABI,
    ethersProvider
  )

  return await Promise.all(
    [
      DAI.functions.balanceOf(POOLS_PARAMS.OneInch.poolContractAddress, overrides).then((value) => new BigNumber(String(value))),
      sthETH.functions.balanceOf(POOLS_PARAMS.OneInch.poolContractAddress, overrides).then((value) => new BigNumber(String(value))),
    ]
  );
}


async function handleOneInchPrice(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  let poolParams = poolsParams.OneInch;
  if (!alreadyReported(poolParams, now)) {
    const [_, stEthReserve] = await getOneInchTokens(blockEvent.blockNumber)

    // 0.1% of token supply in pool
    const stEthTestAmount = stEthReserve.idiv(1000);

    const oneInchPool = new ethers.Contract(
      POOLS_PARAMS.OneInch.poolContractAddress,
      ONE_INCH_POOL_ABI,
      ethersProvider
    );

    const daiTestAmount = new BigNumber(
      String(
        await oneInchPool.functions.getReturn(
          LIDO_DAO_ADDRESS,
          DAI_TOKEN_ADDRESS,
          stEthTestAmount.toFixed(),
          {blockTag: blockEvent.blockNumber}
        )
      )
    );

    const stEthPricePool = daiTestAmount.div(stEthTestAmount);

    const chainlink = new ethers.Contract(
      CHAINLINK_STETH_USD_PRICE_ADDRESS,
      CHAINLINK_STETH_USD_ABI,
      ethersProvider
    );

    const stEthPrice = new BigNumber(
      String((await chainlink.functions.latestRoundData({blockTag: blockEvent.blockNumber}))[1])
    );
    const decimals = parseInt(String(await chainlink.functions.decimals({blockTag: blockEvent.blockNumber})));

    const stEthPriceFeed = stEthPrice.div(10 ** decimals);

    const priceDifference = stEthPricePool
      .div(stEthPriceFeed)
      .times(100)
      .minus(100)
      .toNumber();

    if (Math.abs(priceDifference) > PRICE_DIFFERENCE_THRESHOLD) {
      findings.push(
        Finding.fromObject({
          name: "Significant wstETH price difference between Sushi pool and chainlink feed",
          description: `stETH price in pool (${stEthPricePool.toFixed(2)}) is ${priceDifference.toFixed(2)}% ${priceDifference > 0 ? 'higher' : 'lower'} than chainlink feed (${stEthPriceFeed.toFixed(2)})`,
          alertId: "BAD-ONEINCH-PRICE",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
      poolParams.lastReported = now;
    }
  }
}


async function handleOneInchPoolSize(blockEvent: BlockEvent, findings: Finding[]) {
  let poolParams = poolsParams.OneInch;
  const [daiReserve, stEthReserve] = await getOneInchTokens(blockEvent.blockNumber);
  const poolSizeChangeDai = calcImbalance(poolParams.poolSize.poolSizeToken1, daiReserve);
  const poolSizeChangeStEth = calcImbalance(poolParams.poolSize.poolSizeToken2, stEthReserve);
  if (Math.abs(poolSizeChangeDai) > POOL_SIZE_CHANGE_TOLERANCE_HIGH) {
    findings.push(
      Finding.fromObject({
        name: "Significant OneInch Pool size change",
        description: `OneInch Pool size (DAI part) has ${
          poolSizeChangeDai > 0
            ? "increased by " + poolSizeChangeDai.toFixed(2).toString()
            : "decreased by " + -poolSizeChangeDai.toFixed(2).toString()
        }% since the last block`,
        alertId: "ONEINCH-POOL-SIZE-CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      })
    );
  }
  if (Math.abs(poolSizeChangeStEth) > POOL_SIZE_CHANGE_TOLERANCE_HIGH) {
    findings.push(
      Finding.fromObject({
        name: "Significant OneInch Pool size change",
        description: `OneInch Pool size (stETH part) has ${
          poolSizeChangeStEth > 0
            ? "increased by " + poolSizeChangeStEth.toFixed(2).toString()
            : "decreased by " + -poolSizeChangeStEth.toFixed(2).toString()
        }% since the last block`,
        alertId: "ONEINCH-POOL-SIZE-CHANGE",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      })
    );
  }
  poolParams.poolSize.poolSizeToken1 = daiReserve;
  poolParams.poolSize.poolSizeToken2 = stEthReserve;
}