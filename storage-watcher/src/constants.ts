import BigNumber from "bignumber.js";

// INTERFACES

export interface StorageSlot {
  name: string;
  address?: string;
}

export interface Contract {
  name: string;
  address: string;
}

export interface ContractStorageMap {
  contract: Contract;
  slots: StorageSlot[];
}

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export const NULL_STORAGE = "0x0000000000000000000000000000000000000000000000000000000000000000"

// ADDRESSES AND EVENTS

export const LIDO_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
export const SELFOWNEDSTETHBURNER_ADDRESS =
  "0xb280e33812c0b09353180e92e27b8ad399b07f26";
export const NOR_ADDRESS = "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";
export const LIDO_ORACLE_ADDRESS = "0x442af784a788a5bd6f42a01ebe9f287a871243fb";
export const DEPOSIT_SECURITY_MODULE =
  "0x710b3303fb508a84f10793c1106e32be873c24cd";
export const WSTETH_ADDRESS = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";
export const MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS =
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";
export const ARAGON_VOTING_ADDRESS =
  "0x2e59A20f205bB85a89C53f1936454680651E618e";
export const ARAGON_TOKEN_MANAGER_ADDRESS =
  "0xf73a1260d222f447210581ddf212d915c09a3249";
export const ARAGON_FINANCE_ADDRESS =
  "0xb9e5cbb9ca5b0d659238807e84d0176930753d86";
export const LIDO_TREASURY_ADDRESS =
  "0x3e40d73eb977dc6a537af587d48316fee66e9c8c";

export const SUBMITTED_EVENT =
  "event Submitted(address indexed sender, uint256 amount, address referral)";

// Storage slots mapping

export const STORAGE_SLOTS: ContractStorageMap[] = [
  {
    contract: {
      name: "Lido and stETH token",
      address: LIDO_ADDRESS,
    },
    slots: [
      { name: "lido.Lido.fee" },
      { name: "lido.Lido.treasuryFee" },
      { name: "lido.Lido.insuranceFee" },
      { name: "lido.Lido.nodeOperatorsFee" },
      { name: "lido.Lido.treasuryFee" },
      { name: "lido.Lido.insuranceFund" },
      { name: "lido.Lido.oracle" },
      { name: "lido.Lido.depositContract" },
      { name: "lido.Lido.executionLayerRewardsVault" },
      { name: "lido.Lido.ELRewardsWithdrawalLimit" },
      { name: "lido.Lido.withdrawalCredentials" },
    ],
  },
  {
    contract: {
      name: "SelfOwnedStETHBurner",
      address: SELFOWNEDSTETHBURNER_ADDRESS,
    },
    slots: [{ name: "maxBurnAmountPerRunBasisPoints", address: "0x4" }],
  },
  {
    contract: {
      name: "Node Operators Registry",
      address: NOR_ADDRESS,
    },
    slots: [{ name: "lido.NodeOperatorsRegistry.lido" }],
  },
  {
    contract: {
      name: "Lido Oracle",
      address: LIDO_ORACLE_ADDRESS,
    },
    slots: [
      { name: "lido.LidoOracle.quorum" },
      { name: "lido.LidoOracle.lido" },
      { name: "lido.LidoOracle.beaconSpec" },
      { name: "lido.LidoOracle.contractVersion" },
      { name: "lido.LidoOracle.beaconReportReceiver" },
      { name: "lido.LidoOracle.allowedBeaconBalanceAnnualRelativeIncrease" },
      { name: "lido.LidoOracle.allowedBeaconBalanceDecrease" },
    ],
  },
  {
    contract: {
      name: "Lido Oracle",
      address: DEPOSIT_SECURITY_MODULE,
    },
    slots: [
      { name: "nodeOperatorsRegistry", address: "0x0" },
      { name: "maxDepositsPerBlock", address: "0x1" },
      { name: "minDepositBlockDistance", address: "0x2" },
      { name: "pauseIntentValidityPeriodBlocks", address: "0x3" },
      { name: "owner", address: "0x4" },
      { name: "quorum", address: "0x7" },
      { name: "paused", address: "0x8" },
    ],
  },
  {
    contract: {
      name: "wstETH",
      address: WSTETH_ADDRESS,
    },
    slots: [{ name: "stETH", address: "0x7" }],
  },
  {
    contract: {
      name: "MEV Boost Relay Allowed List",
      address: MEV_BOOST_RELAY_ALLOWED_LIST_ADDRESS,
    },
    slots: [
      { name: "owner", address: "0x0" },
      { name: "manager", address: "0x1" },
      { name: "allowed_list_version", address: "0x4003" },
    ],
  },
  {
    contract: {
      name: "Aragon Voting",
      address: ARAGON_VOTING_ADDRESS,
    },
    slots: [
      { name: "token", address: "0x0" },
      {
        name: "supportRequiredPct, minAcceptQuorumPct, voteTime",
        address: "0x1",
      },
      { name: "objectionPhaseTime", address: "0x4" },
    ],
  },
  {
    contract: {
      name: "Aragon Token Manager",
      address: ARAGON_TOKEN_MANAGER_ADDRESS,
    },
    slots: [
      { name: "token", address: "0x0" },
      { name: "maxAccountTokens", address: "0x1" },
    ],
  },
  {
    contract: {
      name: "Aragon Finance",
      address: ARAGON_FINANCE_ADDRESS,
    },
    slots: [{ name: "vault", address: "0x0" }],
  },
  {
    contract: {
      name: "Lido Treasury",
      address: LIDO_TREASURY_ADDRESS,
    },
    slots: [{ name: "designatedSigner", address: "0x1" }],
  },
];
