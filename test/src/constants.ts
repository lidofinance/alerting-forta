import BigNumber from "bignumber.js";

import { FindingSeverity } from "forta-agent";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export const CSM_ADDRESS = "0x4562c3e63c2e586cd1651b958c22f88135acad4f";

export const EVENTS_OF_NOTICE = [
  {
    event: `event NodeOperatorAdded(
        uint256 indexed nodeOperatorId,
        address indexed managerAddress,
        address indexed rewardAddress
    );
    `,
    alertId: "NODE-OPERATOR-ADDED",
    name: "🌼 New operator in CSM",
    description: (tx: string, args: any) => `Node Operator ${args.nodeOperatorId} created! Tx: ${tx}`,
    severity: FindingSeverity.Medium,
  },
];
