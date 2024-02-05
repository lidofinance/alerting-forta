import { Finding, FindingSeverity, FindingType } from "forta-agent";

export interface SplitWalletParams {
  accounts: string[];
  percentAllocations: number[];
  distributorFee: number;
  controller: string;
}

export const getFindingOfBadSplitWalletParams = (
  splitWalletAddress: string,
  splitWalletParams: SplitWalletParams,
  clusterName: string,
): Finding => {
  const { accounts, percentAllocations, distributorFee, controller } =
    splitWalletParams;
  let nodeOperatorDescription = "";
  let clusterMessage = "";
  if (clusterName) {
    clusterMessage = ` (${clusterName})`;
  }

  return Finding.from({
    alertId: "MALFORMED-REWARD-ADDRESS-PARAMS",
    name: `⚠️ SplitterWrapper${clusterMessage}: SplitWallet has wrong params`,
    description: `${nodeOperatorDescription}splitWallet: ${splitWalletAddress}\n
    accounts: ${accounts.join(", ")}\n
    percentAllocations: ${percentAllocations.join(", ")}\n
    distributorFee: ${distributorFee}\n
    controller: ${controller}\n
  `,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  });
};
