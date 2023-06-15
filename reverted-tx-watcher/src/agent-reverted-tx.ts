import {
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import {
  LIDO_LOCATOR_ADDRESS,
  LocatorContracts,
  staticContracts,
} from "./constants";
import LIDO_LOCATOR_ABI from "./abi/LidoLocator.json";
import { ethersProvider } from "./ethers";

export const name = "RevertedTxWatcher";

let contracts: LocatorContracts;
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

  addresses = [
    ...Object.entries(contracts),
    ...Object.entries(staticContracts),
  ];

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
  const eventAddresses = Object.keys(txEvent.addresses).map((a) =>
    a.toLowerCase()
  );
  const suitableAddresses = addresses.filter(([, address]) =>
    eventAddresses.includes(address.toLowerCase())
  );

  const receipt = await ethersProvider.getTransactionReceipt(
    txEvent.transaction.hash
  );
  if (!receipt) return;
  if (receipt.status !== 0) return;

  for (let [name, address] of suitableAddresses) {
    const fromSelf = address.toLowerCase() === txEvent.from.toLowerCase();
    findings.push(
      Finding.fromObject({
        name: "🤔 Reverted TX detected",
        description:
          `Reverted TX ${fromSelf ? "from" : "to"} the ${name} contract. ` +
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

function etherscanLink(txHash: string): string {
  return `https://etherscan.io/tx/${txHash}`;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
