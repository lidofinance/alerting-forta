import {
  ethers,
  Finding,
  TransactionEvent,
} from "forta-agent";

import {
  LIDO_LOCATOR_ADDRESS,
  LocatorContracts,
  staticContracts,
} from "./constants";
import LIDO_LOCATOR_ABI from "./abi/LidoLocator.json";
import { ethersProvider } from "./ethers";
import { 
  createInfoSeverityFinding, 
  createLowSeverityFinding, 
  createMediumSeverityFinding 
} from "./findings";

export const name = "RevertedTxWatcher";
export const HIGH_GAS_THRESHOLD = "600000";

let contracts: LocatorContracts;
let addresses: [string, string][] = [];
export let gasUsed = ethers.BigNumber.from(0);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const locator = new ethers.Contract(
    LIDO_LOCATOR_ADDRESS,
    LIDO_LOCATOR_ABI,
    ethersProvider,
  );
  contracts = {
    accountingOracle: await locator.accountingOracle(),
    depositSecurityModule: await locator.depositSecurityModule(),
    elRewardsVault: await locator.elRewardsVault(),
    legacyOracle: await locator.legacyOracle(),
    stETHtoken: await locator.lido(),
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
  findings: Finding[],
) {
  const eventAddresses = Object.keys(txEvent.addresses).map((a) =>
    a.toLowerCase(),
  );
  const suitableAddresses = addresses.filter(([, address]) =>
    eventAddresses.includes(address.toLowerCase()),
  );
  if (suitableAddresses.length === 0) return;
  
  const receipt = await ethersProvider.getTransactionReceipt(
    txEvent.transaction.hash,
  );

  gasUsed = ethers.BigNumber.from(receipt.gasUsed);

  if (!receipt) return;
  if (receipt.status !== 0) return;

  for (let [name, address] of suitableAddresses) {
    if (gasUsed.gte(HIGH_GAS_THRESHOLD)) {
      findings.push(
        createLowSeverityFinding(
          name, 
          address, 
          txEvent
        )
      )
  } findings.push(
    createInfoSeverityFinding(
      name, 
      address, 
      txEvent
    )
  )
}
}

export function etherscanLink(txHash: string): string {
  return `https://etherscan.io/tx/${txHash}`;
}

export function etherscanAddress(address: string): string {
  const subpath =
    process.env.FORTA_AGENT_RUN_TIER == "testnet" ? "goerli." : "";
  return `[${address}](https://${subpath}etherscan.io/address/${address})`;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
