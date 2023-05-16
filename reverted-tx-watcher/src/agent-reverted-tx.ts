import {
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import { EASY_TRACK_ADDRESS, LIDO_LOCATOR_ADDRESS } from "./constants";
import LIDO_LOCATOR_ABI from "./abi/LidoLocator.json";
import { ethersProvider } from "./ethers";

export const name = "RevertedTxWatcher";

let contracts: {
  accountingOracle: string;
  depositSecurityModule: string;
  elRewardsVault: string;
  legacyOracle: string;
  lido: string;
  oracleReportSanityChecker: string;
  postTokenRebaseReceiver: string;
  burner: string;
  stakingRouter: string;
  treasury: string;
  validatorsExitBusOracle: string;
  withdrawalQueue: string;
  withdrawalVault: string;
  oracleDaemonConfig: string;
};

let addresses: [string, string][] = [];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const locator = new ethers.Contract(
    LIDO_LOCATOR_ADDRESS,
    LIDO_LOCATOR_ABI,
    ethersProvider
  );
  contracts = {
    accountingOracle: await locator.accountingOracle(),
    depositSecurityModule: await locator.depositSecurityModule(),
    elRewardsVault: await locator.elRewardsVault(),
    legacyOracle: await locator.legacyOracle(),
    lido: await locator.lido(),
    oracleReportSanityChecker: await locator.oracleReportSanityChecker(),
    postTokenRebaseReceiver: await locator.postTokenRebaseReceiver(),
    burner: await locator.burner(),
    stakingRouter: await locator.stakingRouter(),
    treasury: await locator.treasury(),
    validatorsExitBusOracle: await locator.validatorsExitBusOracle(),
    withdrawalQueue: await locator.withdrawalQueue(),
    withdrawalVault: await locator.withdrawalVault(),
    oracleDaemonConfig: await locator.oracleDaemonConfig(),
  };

  addresses = Object.entries(contracts);
  addresses.push(["EasyTrack", EASY_TRACK_ADDRESS]);

  return {
    addresses: JSON.stringify(addresses),
  };
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await handleRevertedTx(txEvent, findings);

  return findings;
}

async function handleRevertedTx(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  for (let [name, address] of addresses) {
    if (address in txEvent.addresses) {
      const receipt = await ethersProvider.getTransactionReceipt(
        txEvent.transaction.hash
      );
      if (receipt.status === 0) {
        const fromSelf = address === txEvent.from;
        findings.push(
          Finding.fromObject({
            name: "Reverted tx",
            description:
              `Reverted tx ${fromSelf ? "from" : "to"} the ${name} contract. ` +
              etherscanLink(txEvent.transaction.hash),
            alertId: "REVERTED-TX",
            severity: FindingSeverity.Info,
            type: FindingType.Suspicious,
            metadata: {
              sender: txEvent.from,
            },
          })
        );
      }
    }
  }
}

function etherscanLink(txHash: string): string {
  return `https://etherscan.io/tx/${txHash}`;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
