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

// Store the last alert timestamp for each guardian
const guardiansBalanceLastAlert: Map<string, number> = new Map();

// Constants related to the Guardian balance thresholds
const {
  DEPOSIT_SECURITY_ADDRESS,
  GUARDIAN_ETH_BALANCE_INFO_THRESHOLD,
  GUARDIAN_ETH_BALANCE_WARN_THRESHOLD,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

// Initialize the DSM contract
const dsmContract = new ethers.Contract(
  DEPOSIT_SECURITY_ADDRESS,
  DEPOSIT_SECURITY_MODULE_ABI,
  ethersProvider,
);

/**
 * Initialize function that is executed once when the agent is started.
 * Can be used to set up any necessary state or resources.
 *
 * @param {number} currentBlock - The current block number when the agent starts.
 * @returns {Promise<object>} An object of initial state (currently unused).
 */
export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

/**
 * This handler is triggered for each new block.
 * It checks the balance of all guardians and raises alerts if necessary.
 *
 * @param {BlockEvent} blockEvent - The current block event.
 * @returns {Promise<Finding[]>} A list of findings generated during this block.
 */
export async function handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Fetch the list of guardians from the contract
  const [guardianList] = await getGuardianList(blockEvent.blockNumber);

  if (guardianList.length < 1) {
    return findings; // No guardians to check
  }

  // Process each guardian's balance
  for (const guardianAddress of guardianList) {
    const finding = await handleGuardianBalance(guardianAddress, blockEvent);
    if (finding) {
      findings.push(finding);
    }
  }

  return findings;
}

/**
 * Retrieves the list of guardians from the DSM contract.
 *
 * @param {number} blockNumber - The block number to query the state at.
 * @returns {Promise<string[]>} The list of guardian addresses.
 */
async function getGuardianList(blockNumber: number): Promise<string[]> {
  return dsmContract.functions.getGuardians({ blockTag: blockNumber });
}

/**
 * Checks the balance of a guardian and raises an alert if it falls below a threshold.
 *
 * @param {string} guardianAddress - The address of the guardian to check.
 * @param {BlockEvent} blockEvent - The current block event.
 * @returns {Promise<Finding | null>} A Finding if the balance is low, otherwise null.
 */
async function handleGuardianBalance(
  guardianAddress: string,
  blockEvent: BlockEvent,
): Promise<Finding | null> {
  const now = blockEvent.block.timestamp;
  const lastAlert = guardiansBalanceLastAlert.get(guardianAddress) || 0;

  // Skip if the last alert was sent within the past week
  if (now <= lastAlert + ONE_WEEK) {
    return null;
  }

  const ethBalance = await getGuardianEthBalance(
    guardianAddress,
    blockEvent.blockNumber,
  );

  // Check if the balance is below the info threshold
  if (ethBalance.isLessThanOrEqualTo(GUARDIAN_ETH_BALANCE_INFO_THRESHOLD)) {
    const severity = determineSeverity(ethBalance);
    const finding = createLowBalanceFinding(
      guardianAddress,
      ethBalance,
      severity,
    );

    // Update the timestamp of the last alert for this guardian
    guardiansBalanceLastAlert.set(guardianAddress, now);

    return finding;
  }

  return null;
}

/**
 * Fetches the current ETH balance of a guardian.
 *
 * @param {string} guardianAddress - The address of the guardian.
 * @param {number} blockNumber - The block number to query the state at.
 * @returns {Promise<BigNumber>} The guardian's ETH balance as a BigNumber.
 */
async function getGuardianEthBalance(
  guardianAddress: string,
  blockNumber: number,
): Promise<BigNumber> {
  const balance = await ethersProvider.getBalance(guardianAddress, blockNumber);
  return new BigNumber(String(balance)).div(ETH_DECIMALS);
}

/**
 * Determines the severity of the alert based on the guardian's ETH balance.
 *
 * @param {BigNumber} ethBalance - The guardian's ETH balance.
 * @returns {FindingSeverity} The severity level of the alert.
 */
function determineSeverity(ethBalance: BigNumber): FindingSeverity {
  return ethBalance.isLessThanOrEqualTo(GUARDIAN_ETH_BALANCE_WARN_THRESHOLD)
    ? FindingSeverity.High
    : FindingSeverity.Info;
}

/**
 * Creates a finding for a low balance alert.
 *
 * @param {string} guardianAddress - The address of the guardian.
 * @param {BigNumber} ethBalance - The ETH balance of the guardian.
 * @param {FindingSeverity} severity - The severity level of the alert.
 * @returns {Finding} A new Finding object with the alert details.
 */
function createLowBalanceFinding(
  guardianAddress: string,
  ethBalance: BigNumber,
  severity: FindingSeverity,
): Finding {
  return Finding.fromObject({
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
}

// Required for Dependency Injection (DI) to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  // initialize, // SDK won't provide any arguments to the function
};
