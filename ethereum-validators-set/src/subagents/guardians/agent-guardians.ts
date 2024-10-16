import {
  BlockEvent,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} from "forta-agent";
import {
  etherscanAddress,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import { ethersProvider } from "../../ethers";
import DEPOSIT_SECURITY_MODULE_ABI from "../../abi/DepositSecurityModule.json";
import type * as Constants from "./constants";
import BigNumber from "bignumber.js";
import { ETH_DECIMALS, ONE_WEEK } from "../../common/constants";

export const name = "Guardians";

let guardiansBalanceLastAlert: Map<string, number> = new Map();
const {
  DEPOSIT_SECURITY_ADDRESS,
  GUARDIAN_ETH_BALANCE_INFO_THRESHOLD,
  GUARDIAN_ETH_BALANCE_WARN_THRESHOLD,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

const dsmContract = new ethers.Contract(
  DEPOSIT_SECURITY_ADDRESS,
  DEPOSIT_SECURITY_MODULE_ABI,
  ethersProvider,
);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  const [guardianList] = await dsmContract.functions.getGuardians({
    blockTag: blockEvent.blockNumber,
  });

  if (guardianList.length < 1) {
    return findings;
  }

  for await (const guardianAddress of guardianList) {
    const finding = await handleGuardianBalance(guardianAddress, blockEvent);
    if (!finding) {
      continue;
    }
    findings.push(finding);
  }

  return findings;
}

async function handleGuardianBalance(
  guardianAddress: string,
  blockEvent: BlockEvent,
) {
  const now = blockEvent.block.timestamp;
  const lastAlert = guardiansBalanceLastAlert.get(guardianAddress) || 0;
  if (now <= lastAlert + ONE_WEEK) {
    return null;
  }

  const ethBalance = new BigNumber(
    String(
      await ethersProvider.getBalance(guardianAddress, blockEvent.blockNumber),
    ),
  ).div(ETH_DECIMALS);
  if (ethBalance.isLessThanOrEqualTo(GUARDIAN_ETH_BALANCE_INFO_THRESHOLD)) {
    const severity = ethBalance.isLessThanOrEqualTo(
      GUARDIAN_ETH_BALANCE_WARN_THRESHOLD,
    )
      ? FindingSeverity.High
      : FindingSeverity.Info;
    const finding = Finding.fromObject({
      name: "⚠️ Low balance of Guardian Member",
      description:
        `Balance of ${etherscanAddress(guardianAddress)} ` +
        `${ethBalance.toFixed(4)} ETH. This is rather low!`,
      alertId: "GUARDIAN-MEMBER-LOW-BALANCE",
      severity,
      type: FindingType.Info,
      metadata: {
        guardian: guardianAddress,
        balance: `${ethBalance}`,
      },
    });
    guardiansBalanceLastAlert.set(guardianAddress, now);

    return finding;
  }

  return null;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
