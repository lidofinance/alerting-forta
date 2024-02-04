import { Finding, FindingSeverity, FindingType } from "forta-agent";

export interface SplitWalletParams {
  accounts: string[];
  percentAllocations: number[];
  distributorFee: number;
  controller: string;
}

export interface NodeOperatorFullInfo {
  name: string;
  rewardAddress: string;
}

export const getEventsOfNoticeForSplitter = () => {
  return [];
};

export const getFindingOfBadSplitWalletParams = (
  splitWalletAddress: string,
  splitWalletParams: SplitWalletParams,
  clusterName?: string,
  nodeOperator?: NodeOperatorFullInfo,
): Finding => {
  const { accounts, percentAllocations, distributorFee, controller } =
    splitWalletParams;
  let nodeOperatorDescription = "";
  if (nodeOperator) {
    const { name, rewardAddress } = nodeOperator;
    nodeOperatorDescription = `nodeOperator: ${name}\nrewardAddress: ${rewardAddress}\n`;
  }
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
