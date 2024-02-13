import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import CURVE_POOL_ABI from "./abi/Curve.json";
import BALANCER_VAULT_ABI from "./abi/Balancer.json";
import FORT_TOKEN_ABI from "./abi/FortToken.json";

import {
  BALANCER_POOL_ID,
  BALANCER_VAULT_ADDRESS,
  CURVE_POOL_ADDRESS,
  POOL_SIZE_CHANGE_TOLERANCE,
  FORT_TOKEN_ADDRESS,
  FORTA_DEPLOYER_ADDRESS,
  MIN_DEPLOYER_BALANCE,
  MATIC_DECIMALS,
} from "./constants";

import { ethersProvider } from "./ethers";
import { abbreviateNumber, polygonscanLink } from "./helpers";

export const name = "Finance";

let curvePoolSize = new BigNumber(0);
let balancerPoolSize = new BigNumber(0);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const curveTokens = await getCurvePoolTokens(currentBlock);
  curvePoolSize = curveTokens[0].plus(curveTokens[1]);

  const balancerTokens = await getBalancerPoolTokens(currentBlock);
  balancerPoolSize = balancerTokens[0].plus(balancerTokens[1]);
  return {
    curvePoolSize: curvePoolSize.toFixed(),
    balancerPoolSize: balancerPoolSize.toFixed(),
  };
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];
  if (blockEvent.blockNumber % 100 == 0) {
    await Promise.all([
      handleCurvePoolSize(blockEvent, findings),
      handleBalancerPoolSize(blockEvent, findings),
      handleFortaDeployerBalance(blockEvent, findings),
    ]);
  }
  return findings;
}

function calcChange(balancePrev: BigNumber, balanceCur: BigNumber) {
  return (balanceCur.div(balancePrev).toNumber() - 1) * 100;
}

async function getCurvePoolTokens(blockNumber?: number): Promise<BigNumber[]> {
  const curveStableSwap = new ethers.Contract(
    CURVE_POOL_ADDRESS,
    CURVE_POOL_ABI,
    ethersProvider,
  );
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }
  const maticBalance = new BigNumber(
    String(await curveStableSwap.functions.balances(0, overrides)),
  );
  const stMaticBalance = new BigNumber(
    String(await curveStableSwap.functions.balances(1, overrides)),
  );
  return [maticBalance, stMaticBalance];
}

async function handleCurvePoolSize(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const poolTokens = await getCurvePoolTokens(blockEvent.blockNumber);
  const poolSize = poolTokens[0].plus(poolTokens[1]);
  const poolSizeChange = calcChange(curvePoolSize, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ Significant Curve Pool (stMATIC) size change",
        description: `Curve Pool size has ${
          poolSizeChange > 0
            ? "increased by " + abbreviateNumber(poolSizeChange)
            : "decreased by " + abbreviateNumber(-poolSizeChange)
        }% since the last block`,
        alertId: "CURVE-POOL-SIZE-CHANGE",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: {
          sizeBefore: curvePoolSize.toFixed(),
          sizeAfter: poolSize.toFixed(),
        },
      }),
    );
  }
  curvePoolSize = poolSize;
}

async function getBalancerPoolTokens(
  blockNumber?: number,
): Promise<BigNumber[]> {
  const balancerVault = new ethers.Contract(
    BALANCER_VAULT_ADDRESS,
    BALANCER_VAULT_ABI,
    ethersProvider,
  );
  let overrides = {} as any;
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }
  const poolTokens = await balancerVault.functions.getPoolTokens(
    BALANCER_POOL_ID,
    overrides,
  );
  return [
    new BigNumber(String(poolTokens.balances[1])),
    new BigNumber(String(poolTokens.balances[0])),
  ];
}

async function handleBalancerPoolSize(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const poolTokens = await getBalancerPoolTokens(blockEvent.blockNumber);
  const poolSize = poolTokens[0].plus(poolTokens[1]);
  const poolSizeChange = calcChange(balancerPoolSize, poolSize);
  if (Math.abs(poolSizeChange) > POOL_SIZE_CHANGE_TOLERANCE) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ Significant Balancer Pool size change",
        description: `Balancer Pool (stMATIC) size has ${
          poolSizeChange > 0
            ? "increased by " + abbreviateNumber(poolSizeChange)
            : "decreased by " + abbreviateNumber(-poolSizeChange)
        }% since the last block`,
        alertId: "BALANCER-POOL-SIZE-CHANGE",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: {
          sizeBefore: balancerPoolSize.toFixed(),
          sizeAfter: poolSize.toFixed(),
        },
      }),
    );
  }
  balancerPoolSize = poolSize;
}

async function handleFortaDeployerBalance(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const fortToken = new ethers.Contract(
    FORT_TOKEN_ADDRESS,
    FORT_TOKEN_ABI,
    ethersProvider,
  );
  const deployerBalance = new BigNumber(
    String(
      await fortToken.functions.balanceOf(FORTA_DEPLOYER_ADDRESS, {
        blockTag: blockEvent.blockNumber,
      }),
    ),
  ).div(MATIC_DECIMALS);
  if (deployerBalance.isLessThan(MIN_DEPLOYER_BALANCE)) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ Forta deployer wallet low FORT balance",
        description:
          `FORT token balance of ${polygonscanLink(FORTA_DEPLOYER_ADDRESS)} is ${deployerBalance.toFixed(2)} FORT/n` +
          `The balance will be drained in less than 2 month. Please refill!`,
        alertId: "LOW-FORTA-DEPLOYER-BALANCE",
        severity: FindingSeverity.High,
        type: FindingType.Info,
        metadata: {
          deployerBalance: deployerBalance.toFixed(),
        },
      }),
    );
  }
}
