import { HandleBlock, HandleTransaction } from "forta-agent";

export type SubAgentMetadata = Record<string, string>;

export type SubAgent = {
  name: string;
  handleBlock?: HandleBlock;
  handleTransaction?: HandleTransaction;
  initialize?: (blockNumber: number) => Promise<SubAgentMetadata>;
};
