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
import { ETH_DECIMALS } from "../../common/constants";

export const name = "Guardians";

const { DEPOSIT_SECURITY_ADDRESS, GUARDIAN_MIN_ETH_BALANCE_THRESHOLD } =
  requireWithTier<typeof Constants>(module, `./constants`, RedefineMode.Merge);

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
    const ethBalance = new BigNumber(
      String(
        await ethersProvider.getBalance(
          guardianAddress,
          blockEvent.blockNumber,
        ),
      ),
    ).div(ETH_DECIMALS);
    if (ethBalance.isLessThanOrEqualTo(GUARDIAN_MIN_ETH_BALANCE_THRESHOLD)) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Low balance of Guardian Member",
          description:
            `Balance of ${etherscanAddress(guardianAddress)} ` +
            `${ethBalance.toFixed(4)} ETH. This is rather low!`,
          alertId: "GUARDIAN-MEMBER-LOW-BALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: {
            guardian: guardianAddress,
            balance: `${ethBalance}`,
          },
        }),
      );
    }
  }

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
