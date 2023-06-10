import { BigNumber } from "bignumber.js";
import {
  Finding,
  FindingType,
  FindingSeverity,
  BlockEvent,
  TransactionEvent,
  ethers,
} from "forta-agent";

import { ethersProvider } from "../../ethers";
import { RedefineMode, requireWithTier } from "../../common/utils";
import { ETH_DECIMALS } from "../../common/constants";
import LIDO_ABI from "../../abi/Lido.json";

import type * as Constants from "./constants";

export const name = "Vaults";

export let lido: ethers.Contract;

const {
  WITHDRAWAL_VAULT_ADDRESS,
  EL_VAULT_ADDRESS,
  BURNER_ADDRESS,
  LIDO_STETH_ADDRESS,
  TRANSFER_SHARES_EVENT,
  WITHDRAWAL_VAULT_BALANCE_DIFF_HIGH,
  WITHDRAWAL_VAULT_BALANCE_DIFF_INFO,
  EL_VAULT_BALANCE_DIFF_INFO,
  EL_VAULT_BALANCE_DIFF_MEDIUM,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge
);

export async function initialize(): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  lido = new ethers.Contract(LIDO_STETH_ADDRESS, LIDO_ABI, ethersProvider);

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  const currentBlock = blockEvent.blockNumber;

  const prevBlockWithrawalVaultBalance = await getBalance(
    WITHDRAWAL_VAULT_ADDRESS,
    currentBlock - 1
  );
  const prevBlockElVaultBalance = await getBalance(
    EL_VAULT_ADDRESS,
    currentBlock - 1
  );

  const [report] = await lido.queryFilter(
    lido.filters.ETHDistributed(),
    currentBlock,
    currentBlock
  );

  await Promise.all([
    handleWithdrawalVaultBalance(
      currentBlock,
      prevBlockWithrawalVaultBalance,
      findings
    ),
    handleELVaultBalance(currentBlock, prevBlockElVaultBalance, findings),
    handleNoWithdrawalVaultDrains(
      currentBlock,
      prevBlockWithrawalVaultBalance,
      report,
      findings
    ),
    handleNoELVaultDrains(
      currentBlock,
      prevBlockElVaultBalance,
      report,
      findings
    ),
  ]);

  return findings;
}

async function handleWithdrawalVaultBalance(
  blockNumber: number,
  prevBalance: BigNumber,
  findings: Finding[]
) {
  const withdrawalVaultBalance = await getBalance(
    WITHDRAWAL_VAULT_ADDRESS,
    blockNumber
  );

  const withdrawalVaultBalanceDiff = withdrawalVaultBalance.minus(prevBalance);

  if (withdrawalVaultBalanceDiff.gte(WITHDRAWAL_VAULT_BALANCE_DIFF_INFO)) {
    const severity = withdrawalVaultBalanceDiff.gte(
      WITHDRAWAL_VAULT_BALANCE_DIFF_HIGH
    )
      ? FindingSeverity.High
      : FindingSeverity.Info;

    findings.push(
      Finding.fromObject({
        name: "💵 Withdrawal Vault Balance significant change",
        description: `Withdrawal Vault Balance has increased by ${toEthString(
          withdrawalVaultBalanceDiff
        )}`,
        alertId: "WITHDRAWAL_VAULT_BALANCE_CHANGE",
        type: FindingType.Suspicious,
        severity,
      })
    );
  }
}

async function handleNoWithdrawalVaultDrains(
  currentBlock: number,
  prevBalance: BigNumber,
  report: ethers.Event | undefined,
  findings: Finding[]
) {
  const currentBalance = await getBalance(
    WITHDRAWAL_VAULT_ADDRESS,
    currentBlock
  );

  if (!report) {
    if (currentBalance.lt(prevBalance)) {
      findings.push(
        Finding.fromObject({
          name: "🚨 Withdrawal Vault balance mismatch",
          description: `Withdrawal Vault Balance has decreased by ${toEthString(
            prevBalance.minus(currentBalance)
          )} without Oracle report`,
          alertId: "WITHDRAWAL-VAULT-BALANCE-DRAIN",
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        })
      );
    }
    return;
  }

  if (report?.args) {
    const { withdrawalsWithdrawn } = report.args;
    const expectedBalance = prevBalance.minus(withdrawalsWithdrawn);

    if (currentBalance.lt(expectedBalance)) {
      findings.push(
        Finding.fromObject({
          name: "🚨 Withdrawal Vault balance mismatch",
          description: `Withdrawal Vault Balance has decreased by ${toEthString(
            expectedBalance.minus(currentBalance)
          )} but Oracle report shows ${toEthString(withdrawalsWithdrawn)}`,
          alertId: "WITHDRAWAL-VAULT-BALANCE-DRAIN",
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        })
      );
    }
  }
}

async function handleELVaultBalance(
  blockNumber: number,
  prevBalance: BigNumber,
  findings: Finding[]
) {
  const elVaultBalance = await getBalance(EL_VAULT_ADDRESS, blockNumber);
  const elVaultBalanceDiff = elVaultBalance.minus(prevBalance);

  if (elVaultBalanceDiff.gte(EL_VAULT_BALANCE_DIFF_INFO)) {
    const severity = elVaultBalanceDiff.gte(EL_VAULT_BALANCE_DIFF_MEDIUM)
      ? FindingSeverity.Medium
      : FindingSeverity.Info;

    findings.push(
      Finding.fromObject({
        name: "💵 EL Vault Balance significant change",
        description: `EL Vault Balance has increased by ${toEthString(
          elVaultBalanceDiff
        )}`,
        alertId: "EL_VAULT_BALANCE_CHANGE",
        type: FindingType.Suspicious,
        severity,
      })
    );
  }
}

async function handleNoELVaultDrains(
  currentBlock: number,
  prevBalance: BigNumber,
  report: ethers.Event | undefined,
  findings: Finding[]
) {
  const currentBalance = await getBalance(EL_VAULT_ADDRESS, currentBlock);

  if (!report) {
    if (currentBalance.lt(prevBalance)) {
      findings.push(
        Finding.fromObject({
          name: "🚨 EL Vault balance mismatch",
          description: `EL Vault Balance has decreased by ${toEthString(
            prevBalance.minus(currentBalance)
          )} without Oracle report`,
          alertId: "EL-VAULT-BALANCE-DRAIN",
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        })
      );
    }
    return;
  }

  if (report?.args) {
    const { executionLayerRewardsWithdrawn } = report.args;
    const expectedBalance = prevBalance.minus(executionLayerRewardsWithdrawn);

    if (currentBalance.lt(expectedBalance)) {
      findings.push(
        Finding.fromObject({
          name: "🚨 EL Vault balance mismatch",
          description: `EL Vault Balance has decreased by ${toEthString(
            expectedBalance.minus(currentBalance)
          )} but Oracle report shows ${toEthString(
            executionLayerRewardsWithdrawn
          )}`,
          alertId: "EL-VAULT-BALANCE-DRAIN",
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        })
      );
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await handleBurnerSharesTx(txEvent, findings);

  return findings;
}

async function handleBurnerSharesTx(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const events = txEvent
    .filterLog(TRANSFER_SHARES_EVENT, LIDO_STETH_ADDRESS)
    .filter((e) => e.args.from.toLowerCase() === BURNER_ADDRESS.toLowerCase());

  for (const event of events) {
    findings.push(
      Finding.fromObject({
        name: "🚨 Burner shares transfer",
        description: `Burner shares transfer to ${event.args.to} has occurred`,
        alertId: "BURNER_SHARES_TRANSFER",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  }
}

async function getBalance(
  address: string,
  blockNumber: number
): Promise<BigNumber> {
  return BigNumber(
    (await ethersProvider.getBalance(address, blockNumber)).toString()
  );
}

// TODO: move to common/utils
function toEthString(wei: BigNumber): string {
  return wei.dividedBy(ETH_DECIMALS).toFixed(3) + " ETH";
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
