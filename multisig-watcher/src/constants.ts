import BigNumber from "bignumber.js";

import { FindingSeverity } from "forta-agent";

// INTERFACES AND ENUMS

export enum Blockchain {
  ETH = "Ethereum",
  POLYGON = "Polygon",
  ARBITRUM = "Arbitrum",
  OPTIMISM = "Optimism",
  MOONBEAM = "Moonbeam",
  MOONRIVER = "Moonriver",
}

export interface SafeTX {
  safeAddress: string;
  safeName: string;
  tx: string;
  safeTx: string;
  blockchain: Blockchain;
}

export interface BlockchainInfo {
  addressUrlPrefix: string;
  txUrlPrefix: string;
  safeTxUrlPrefix: string;
}

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export const NON_ETH_FETCH_INTERVAL = 10;

// export const SUMMARY_BLOCK_INTERVAL = 900;

export const BLOCKCHAIN_INFO: { [key in Blockchain]: BlockchainInfo } = {
  [Blockchain.ETH]: {
    addressUrlPrefix: "https://etherscan.io/address/",
    txUrlPrefix: "https://etherscan.io/tx/",
    safeTxUrlPrefix: "https://gnosis-safe.io/app/eth:",
  },
  [Blockchain.POLYGON]: {
    addressUrlPrefix: "https://polygonscan.com/address/",
    txUrlPrefix: "https://polygonscan.com/tx/",
    safeTxUrlPrefix: "https://gnosis-safe.io/app/matic:",
  },
  [Blockchain.ARBITRUM]: {
    addressUrlPrefix: "https://arbiscan.io/address/",
    txUrlPrefix: "https://arbiscan.io/tx/",
    safeTxUrlPrefix: "https://gnosis-safe.io/app/arb1:",
  },
  [Blockchain.OPTIMISM]: {
    addressUrlPrefix: "https://optimistic.etherscan.io/address/",
    txUrlPrefix: "https://optimistic.etherscan.io/tx/",
    safeTxUrlPrefix: "https://gnosis-safe.io/app/oeth:",
  },
  [Blockchain.MOONBEAM]: {
    addressUrlPrefix: "https://moonbeam.moonscan.io/address/",
    txUrlPrefix: "https://moonbeam.moonscan.io/tx/",
    safeTxUrlPrefix: "https://multisig.moonbeam.network/mbeam:",
  },
  [Blockchain.MOONRIVER]: {
    addressUrlPrefix: "https://moonriver.moonscan.io/address/",
    txUrlPrefix: "https://moonriver.moonscan.io/tx/",
    safeTxUrlPrefix: "https://multisig.moonbeam.network/mriver:",
  },
};

// ADDRESSES AND EVENTS

export const SAFES = {
  [Blockchain.ETH]: [
    [
      "0x17f6b2c738a63a8d3a113a228cfd0b373244633d",
      "Pool Maintenance Labs Ltd. (PML)",
    ],
    [
      "0x9b1cebf7616f2bc73b47d226f90b01a7c9f86956",
      "Argo Technology Consulting Ltd. (ATC)",
    ],
    [
      "0xde06d17db9295fa8c4082d4f73ff81592a3ac437",
      "Resourcing and Compensation Committee (RCC)",
    ],
    [
      "0x87d93d9b2c672bf9c9642d853a8682546a5012b5",
      "reWARDS Committee (Ethereum)",
    ],
    ["0x12a43b049a7d330cb8aeab5113032d18ae9a9030", "LEGO Committee"],
    [
      "0xe2a682a9722354d825d1bbdf372cc86b2ea82c8c",
      "Referral Program Committee",
    ],
    ["0x3cd9f71f80ab08ea5a7dca348b5e94bc595f26a0", "Lido Dev team (Ethereum)"],
    [
      "0x5181d5d56af4f823b96fe05f062d7a09761a5a53",
      "Depositor bot gas funding (Ethereum)",
    ],
    ["0x14cef290c79fc84fddfdf4129ba335972aac7f41", "Lido Subgraph NFT owner"],
    [
      "0x73b047fe6337183A454c5217241D780a932777bD",
      "Emergency Brakes (Ethereum)",
    ],
    [
      "0xd65Fa54F8DF43064dfd8dDF223A446fc638800A9",
      "Lido-on-polygon multisig upgrader",
    ],
  ],
  [Blockchain.POLYGON]: [
    [
      "0x87d93d9b2c672bf9c9642d853a8682546a5012b5",
      "reWARDS Committee (Polygon)",
    ],
  ],
  [Blockchain.ARBITRUM]: [
    [
      "0x8c2b8595ea1b627427efe4f29a64b145df439d16",
      "reWARDS Committee (Arbitrum)",
    ],
  ],
  [Blockchain.OPTIMISM]: [
    [
      "0x5033823f27c5f977707b58f0351adcd732c955dd",
      "reWARDS Committee (Optimism)",
    ],
  ],
  [Blockchain.MOONBEAM]: [
    [
      "0x007132343ca619c5449297507b26c3f85e80d1b1",
      "reWARDS Committee (Moonbeam)",
    ],
    [
      "0x34fc04fa7e8e142001aaeed25da8cf7dd887a5f3",
      "Contracts updater (Moonbeam)",
    ],
    [
      "0xd00e0d8e42b8222745f4e921c6fa7ff620fa8e96",
      "Parameters manager (Moonbeam)",
    ],
    [
      "0xab4046bdf1a58c628d925602b05fb1696b74ac2c",
      "Parameters setter (Moonbeam)",
    ],
    [
      "0x3ef396fa1a363025b3cedc07d828fa512ccc7156",
      "Renomination manager (Moonbeam)",
    ],
  ],
  [Blockchain.MOONRIVER]: [
    [
      "0xdafc1dcb93da415604ac6187638f88a8ff8d77a4",
      "reWARDS Committee (Moonriver)",
    ],
    [
      "0xdafc1dcb93da415604ac6187638f88a8ff8d77a4",
      "Contracts updater (Moonriver)",
    ],
    [
      "0xf3b2c83400d60ee91f716eaa4e9ef59c49f2d1ae",
      "Parameters manager (Moonriver)",
    ],
    [
      "0xb4d206664c53986b66eba65203c7f2d2924ab351",
      "Parameters setter (Moonriver)",
    ],
    [
      "0xc4520846052adc9d92ad161a5bde907869cd0da4",
      "Renomination manager (Moonriver)",
    ],
  ],
};

export const GNOSIS_SAFE_EVENTS_OF_NOTICE = [
  {
    event: "event AddedOwner(address owner)",
    alertId: "SAFE-OWNER-ADDED",
    name: "🚨 Gnosis Safe: Owner added",
    description: (safeTx: SafeTX, args: any) =>
      `New owner ${args.owner} was added to ${getSafeLink(safeTx)}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: "event RemovedOwner(address owner)",
    alertId: "SAFE-OWNER-REMOVED",
    name: "🚨 Gnosis Safe: Owner removed",
    description: (safeTx: SafeTX, args: any) =>
      `Owner ${args.owner} was removed from ${getSafeLink(safeTx)}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: "event ChangedFallbackHandler(address handler)",
    alertId: "SAFE-HANDLER-CHANGED",
    name: "🚨 Gnosis Safe: Fallback handler changed",
    description: (safeTx: SafeTX, args: any) =>
      `Fallback handler for ${getSafeLink(safeTx)} was changed to ${
        args.handler
      }`,
    severity: FindingSeverity.Medium,
  },
  {
    event: "event ChangedGuard(address guard)",
    alertId: "SAFE-GUARD-CHANGED",
    name: "🚨 Gnosis Safe: Guard changed",
    description: (safeTx: SafeTX, args: any) =>
      `Guard for ${getSafeLink(safeTx)} was changed to ${args.guard}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: "event ChangedThreshold(uint256 threshold)",
    alertId: "SAFE-THRESHOLD-CHANGED",
    name: "🚨 Gnosis Safe: Threshold changed",
    description: (safeTx: SafeTX, args: any) =>
      `Threshold for ${getSafeLink(safeTx)} was changed to ${args.threshold}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: "event DisabledModule(address module)",
    alertId: "SAFE-MODULE-DISABLED",
    name: "🚨 Gnosis Safe: Module disabled",
    description: (safeTx: SafeTX, args: any) =>
      `Module ${args.module} was disabled for ${getSafeLink(safeTx)}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: "event EnabledModule(address module)",
    alertId: "SAFE-MODULE-ENABLED",
    name: "🚨 Gnosis Safe: Module enabled",
    description: (safeTx: SafeTX, args: any) =>
      `Module ${args.module} was enabled for ${getSafeLink(safeTx)}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: "event ExecutionFailure(bytes32 txHash, uint256 payment)",
    alertId: "SAFE-EXECUTION-FAILURE",
    name: "❌ Gnosis Safe: TX Execution failed",
    description: (safeTx: SafeTX, args: any) =>
      `[TX](${getSafeTxLink(safeTx)}) execution failed for ${getSafeLink(
        safeTx
      )}\n` + `[See in explorer](${getTxLink(safeTx)})`,
    severity: FindingSeverity.Info,
  },
  {
    event: "event ExecutionSuccess(bytes32 txHash, uint256 payment)",
    alertId: "SAFE-EXECUTION-SUCCESS",
    name: "✅ Gnosis Safe: TX Executed",
    description: (safeTx: SafeTX, args: any) =>
      `[TX](${getSafeTxLink(safeTx)}) executed by ${getSafeLink(safeTx)}\n` +
      `[TX in blockchain explorer](${getTxLink(safeTx)})`,
    severity: FindingSeverity.Info,
  },
  {
    event: "event ExecutionFromModuleFailure(address module)",
    alertId: "SAFE-EXECUTION-FAILURE-FROM-MODULE",
    name: "❌ Gnosis Safe: Execution failed from module",
    description: (safeTx: SafeTX, args: any) =>
      `TX execution failed for ${getSafeLink(safeTx)} from module ${
        args.module
      }`,
    severity: FindingSeverity.Info,
  },
  {
    event: "event ExecutionFromModuleSuccess(address module)",
    alertId: "SAFE-EXECUTION-SUCCESS-FROM-MODULE",
    name: "✅ Gnosis Safe: Execution success from module",
    description: (safeTx: SafeTX, args: any) =>
      `Execution success for ${getSafeLink(safeTx)} from module ${args.module}`,
    severity: FindingSeverity.Info,
  },
];

function getSafeLink(safeTx: SafeTX): string {
  return `[${safeTx.safeName}](${
    BLOCKCHAIN_INFO[safeTx.blockchain].safeTxUrlPrefix
  }${safeTx.safeAddress})`;
}

function getSafeTxLink(safeTx: SafeTX): string {
  return `${BLOCKCHAIN_INFO[safeTx.blockchain].safeTxUrlPrefix}${
    safeTx.safeAddress
  }/transactions/${safeTx.safeTx}`;
}

function getTxLink(safeTx: SafeTX): string {
  return `${BLOCKCHAIN_INFO[safeTx.blockchain].txUrlPrefix}${safeTx.tx}`;
}
