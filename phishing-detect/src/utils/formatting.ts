import { ISpenderInfo } from "./interfaces";

interface ISpenderSummary {
  spender: string;
  spenderType: string;
  totalTypes: number;
  totalApprovers: number;
}

export function etherscanLink(address: string): string {
  return `https://etherscan.io/address/${address.toLowerCase()}`;
}

export function makeTopSummary(spenders: Map<string, ISpenderInfo>) {
  let topSpenders: ISpenderSummary[] = [];
  spenders.forEach((spenderInfo: ISpenderInfo, spenderAddress: string) => {
    let spenderSummary: ISpenderSummary = {
      spender: spenderAddress,
      spenderType: spenderInfo.isContract ? "contract" : "EOA",
      totalTypes: spenderInfo.approvers.size,
      totalApprovers: 0,
    };
    let totalApprovers = 0;
    spenderInfo.approvers.forEach((approvers: Set<string>, token: string) => {
      totalApprovers += approvers.size;
    });
    spenderSummary.totalApprovers = totalApprovers;
    topSpenders.push(spenderSummary);
  });
  topSpenders.sort((a, b) => b.totalApprovers - a.totalApprovers);
  const topSpendersByApprovals = topSpenders.slice(
    0,
    topSpenders.length > 10 ? 9 : topSpenders.length
  );
  let summary =
    "[Top Spenders by Approvals count]\nspender | spender type | approvals total\n";
  topSpendersByApprovals.forEach((spenderSummary: ISpenderSummary) => {
    summary +=
      `${spenderSummary.spender} | ${spenderSummary.spenderType} ` +
      `| ${spenderSummary.totalApprovers}\n`;
  });
  topSpenders.sort((a, b) => b.totalTypes - a.totalTypes);
  const topSpendersByTypes = topSpenders.slice(
    0,
    topSpenders.length > 10 ? 9 : topSpenders.length
  );
  summary +=
    "[Top Spenders by ERC20 types count]\nspender | spender type | ERC20 types total\n";
  topSpendersByTypes.forEach((spenderSummary: ISpenderSummary) => {
    summary +=
      `${spenderSummary.spender} | ${spenderSummary.spenderType} ` +
      `| ${spenderSummary.totalTypes}\n`;
  });
  return summary;
}
