import {
  ethers,
  Finding,
  TransactionEvent,
} from "forta-agent";

import {
  DAY,
  LIDO_LOCATOR_ADDRESS,
  LocatorContracts,
  staticContracts,
} from "./constants";
import LIDO_LOCATOR_ABI from "./abi/LidoLocator.json";
import { ethersProvider } from "./ethers";
import { 
  createInfoSeverityFinding, 
  createRevertedTxFindingWithHighGas, 
  createRevertedTxFindingWithPossibleSpam 
} from "./findings";

interface RevertDictionary {
  [key: string]: number;
}

export const name = "RevertedTxWatcher";
export const HIGH_GAS_THRESHOLD = "600000";
export const MAX_REVERTION_PER_DAY = 15
let revertedTxPerEOA: RevertDictionary = {};
let contracts: LocatorContracts;
let addresses: [string, string][] = [];
export let gasUsed = ethers.BigNumber.from(0);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  startTimer()
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
    increaseForEOA(txEvent.from)
    if (revertedTxPerEOA[txEvent.from] > MAX_REVERTION_PER_DAY) {
        findings.push(
          createRevertedTxFindingWithPossibleSpam(
            name, 
            address, 
            txEvent,
            revertedTxPerEOA[txEvent.from]
          )
        )
    }
    if (gasUsed.gte(HIGH_GAS_THRESHOLD)) {
      findings.push(
        createRevertedTxFindingWithHighGas(
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

function startTimer() {
  setInterval(resetDictionary, DAY);
}

function increaseForEOA(address: string) {
  if (!revertedTxPerEOA[address]) {
    revertedTxPerEOA[address] = 0;
  } revertedTxPerEOA[address]++;
}

function resetDictionary() {
  revertedTxPerEOA = {};
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
