import BigNumber from "bignumber.js";
import { ethers, Finding, FindingType, FindingSeverity } from "forta-agent";
import {
  ETH_DECIMALS,
  WSTETH_ADDRESS,
  BASE_L1_GATEWAY,
  BASE_WST_ETH_BRIDGED,
  LDO_ADDRESS,
} from "./constants";
import ERC20_SHORT_ABI from "./abi/ERC20Short.json";
import { baseProvider, ethersProvider } from "./providers";

export const name = "Balance";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(block: BlockDto) {
  const findings: Finding[] = [];

  await Promise.all([handleBridgeBalanceWstETH(block, findings)]);

  return findings;
}

async function handleBridgeBalanceWstETH(block: BlockDto, findings: Finding[]) {
  const wstETH = new ethers.Contract(
    WSTETH_ADDRESS,
    ERC20_SHORT_ABI,
    ethersProvider,
  );
  const l1Balance = new BigNumber(
    String(await wstETH.functions.balanceOf(BASE_L1_GATEWAY)),
  );

  const bridgedWstETH = new ethers.Contract(
    BASE_WST_ETH_BRIDGED,
    ERC20_SHORT_ABI,
    baseProvider,
  );
  const l2TotalSupply = new BigNumber(
    String(await bridgedWstETH.functions.totalSupply()),
  );
  if (l2TotalSupply.isGreaterThan(l1Balance)) {
    findings.push(
      Finding.fromObject({
        name: `🚨🚨🚨 Base bridge balance mismatch 🚨🚨🚨`,
        description:
          `Total supply of bridged wstETH is greater than balanceOf L1 bridge side!\n` +
          `L2 total supply: ${l2TotalSupply.div(ETH_DECIMALS).toFixed(2)}\n` +
          `L1 balanceOf: ${l1Balance.div(ETH_DECIMALS).toFixed(2)}\n`,
        alertId: "BRIDGE-BALANCE-MISMATCH",
        severity: FindingSeverity.Critical,
        type: FindingType.Suspicious,
        metadata: {
          l2TotalSupply: l2TotalSupply.toFixed(),
          l1Balance: l1Balance.toFixed(),
          l1Address: BASE_L1_GATEWAY,
          l2Token: BASE_WST_ETH_BRIDGED,
          network: "Base",
        },
      }),
    );
  }
}
