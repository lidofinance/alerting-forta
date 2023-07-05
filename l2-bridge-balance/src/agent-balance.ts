import BigNumber from "bignumber.js";
import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";
import {
  BRIDGE_PARAMS_WSTETH,
  BRIDGE_PARAMS_LDO,
  WSTETH_ADDRESS,
  ETH_DECIMALS,
  BridgeParamWstETH,
  BridgeParamLDO,
  LDO_ADDRESS,
} from "./constants";
import ERC20_SHORT_ABI from "./abi/ERC20Short.json";
import { ethersProvider } from "./ethers";

export const name = "BridgeWatcher";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleBridgeBalanceWstETH(
      blockEvent,
      findings,
      BRIDGE_PARAMS_WSTETH.Arbitrum,
    ),
    handleBridgeBalanceWstETH(
      blockEvent,
      findings,
      BRIDGE_PARAMS_WSTETH.Optimism,
    ),
    handleBridgeBalanceLDO(blockEvent, findings, BRIDGE_PARAMS_LDO.Arbitrum),
    handleBridgeBalanceLDO(blockEvent, findings, BRIDGE_PARAMS_LDO.Optimism),
  ]);

  return findings;
}

async function handleBridgeBalanceWstETH(
  blockEvent: BlockEvent,
  findings: Finding[],
  networkParams: BridgeParamWstETH,
) {
  const wstETH = new ethers.Contract(
    WSTETH_ADDRESS,
    ERC20_SHORT_ABI,
    ethersProvider,
  );
  const l1Balance = new BigNumber(
    String(await wstETH.functions.balanceOf(networkParams.l1Gateway)),
  );
  const l2Provider = new ethers.providers.JsonRpcProvider(networkParams.rpcUrl);
  const bridgedWstETH = new ethers.Contract(
    networkParams.wstEthBridged,
    ERC20_SHORT_ABI,
    l2Provider,
  );
  const l2TotalSupply = new BigNumber(
    String(await bridgedWstETH.functions.totalSupply()),
  );
  if (l2TotalSupply.isGreaterThan(l1Balance)) {
    findings.push(
      Finding.fromObject({
        name: `🚨🚨🚨 ${networkParams.name} bridge balance mismatch 🚨🚨🚨`,
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
          l1Address: networkParams.l1Gateway,
          l2Token: networkParams.wstEthBridged,
          network: networkParams.name,
        },
      }),
    );
  }
}

async function handleBridgeBalanceLDO(
  blockEvent: BlockEvent,
  findings: Finding[],
  networkParams: BridgeParamLDO,
) {
  const LDO = new ethers.Contract(LDO_ADDRESS, ERC20_SHORT_ABI, ethersProvider);
  const l1Balance = new BigNumber(
    String(await LDO.functions.balanceOf(networkParams.l1Gateway)),
  );
  const l2Provider = new ethers.providers.JsonRpcProvider(networkParams.rpcUrl);
  const bridgedLDO = new ethers.Contract(
    networkParams.ldoBridged,
    ERC20_SHORT_ABI,
    l2Provider,
  );
  const l2TotalSupply = new BigNumber(
    String(await bridgedLDO.functions.totalSupply()),
  );
  if (l2TotalSupply.isGreaterThan(l1Balance)) {
    findings.push(
      Finding.fromObject({
        name: `🚨🚨🚨 ${networkParams.name} bridge balance mismatch 🚨🚨🚨`,
        description:
          `Total supply of bridged LDO is greater than balanceOf L1 bridge side!\n` +
          `L2 total supply: ${l2TotalSupply.div(ETH_DECIMALS).toFixed(2)}\n` +
          `L1 balanceOf: ${l1Balance.div(ETH_DECIMALS).toFixed(2)}\n`,
        alertId: "BRIDGE-BALANCE-MISMATCH",
        severity: FindingSeverity.Critical,
        type: FindingType.Suspicious,
        metadata: {
          l2TotalSupply: l2TotalSupply.toFixed(),
          l1Balance: l1Balance.toFixed(),
          l1Address: networkParams.l1Gateway,
          l2Token: networkParams.ldoBridged,
          network: networkParams.name,
        },
      }),
    );
  }
}
