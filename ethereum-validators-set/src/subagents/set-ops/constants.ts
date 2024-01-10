import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import { etherscanAddress } from "../../common/utils";
import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  CURATED_NODE_OPERATORS_REGISTRY_ADDRESS as curatedNorAddress,
  SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS as simpleDvtNorAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  DEPOSIT_SECURITY_ADDRESS as dsAddress,
  DEPOSIT_EXECUTOR_ADDRESS as deAddress,
  MEV_ALLOWED_LIST_ADDRESS as mevAllowlistAddress,
  INSURANCE_FUND_ADDRESS as insuranceAddress,
  BURNER_ADDRESS as burnerAddress,
  TRP_FACTORY_ADDRESS as trpFactoryAddress,
  ENS_BASE_REGISTRAR_ADDRESS as ensRegistrarAddress,
} from "../../common/constants";

// 24 hours
export const REPORT_WINDOW = 60 * 60 * 24;
// 24 hours
export const MEV_RELAY_COUNT_THRESHOLD_HIGH = 2;
export const MEV_RELAY_COUNT_THRESHOLD_INFO = 4;
// 24 hours
export const MEV_RELAY_COUNT_REPORT_WINDOW = 60 * 60 * 24;
// 20 minutes
export const BLOCK_CHECK_INTERVAL = 100;

export const LIDO_STETH_ADDRESS = lidoStethAddress;
export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const DEPOSIT_SECURITY_ADDRESS = dsAddress;
export const DEPOSIT_EXECUTOR_ADDRESS = deAddress;
export const MEV_ALLOWED_LIST_ADDRESS = mevAllowlistAddress;
export const INSURANCE_FUND_ADDRESS = insuranceAddress;
export const BURNER_ADDRESS = burnerAddress;
export const TRP_FACTORY_ADDRESS = trpFactoryAddress;
export const ENS_BASE_REGISTRAR_ADDRESS = ensRegistrarAddress;
export const CURATED_NODE_OPERATORS_REGISTRY_ADDRESS = curatedNorAddress;
export const SIMPLEDVT_NODE_OPERATORS_REGISTRY_ADDRESS = simpleDvtNorAddress;

export const MIN_AVAILABLE_KEYS_COUNT = 1000;

export const MEV_ALLOWED_LIST_EVENTS_OF_NOTICE = [
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event:
      "event RelayAdded (string indexed uri_hash, (string uri, string operator, bool is_mandatory, string description) relay)",
    alertId: "MEV-RELAY-ADDED",
    name: "ℹ️ MEV Allowed list: Relay added",
    description: (args: any) =>
      `New MEV relay added.\n` +
      `URI: ${args[1].uri}\n` +
      `Operator: ${args[1].operator}\n` +
      `Mandatory: ${args[1].is_mandatory}\n` +
      `Description: ${args[1].description}`,
    severity: FindingSeverity.Info,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event: "event RelayRemoved (string indexed uri_hash, string uri)",
    alertId: "MEV-RELAY-REMOVED",
    name: "⚠️ MEV Allowed list: Relay removed",
    description: (args: any) => `MEV relay removed.\nURI: ${args[1]}`,
    severity: FindingSeverity.Info,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event:
      "event ERC20Recovered (address indexed token, uint256 amount, address indexed recipient)",
    alertId: "MEV-ERC20-RECOVERED",
    name: "⚠️ MEV Allowed list: ERC20 Recovered",
    description: (args: any) =>
      `ERC20 tokens were recovered from MEV allowed list contract.\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${new BigNumber(String(args.amount)).toFixed(0)}\n` +
      `Recipient: ${etherscanAddress(args.recipient)}`,
    severity: FindingSeverity.Info,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event: "event OwnerChanged (uint256 indexed new_owner)",
    alertId: "MEV-LIST-OWNER-CHANGED",
    name: "🚨 MEV Allowed list: Owner changed",
    description: (args: any) =>
      `MEV allowed list owner has changed.\nNew owner: ${args.new_owner}`,
    severity: FindingSeverity.High,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event: "event ManagerChanged (uint256 indexed new_manager)",
    alertId: "MEV-LIST-MANAGER-CHANGED",
    name: "🚨 MEV Allowed list: Manager changed",
    description: (args: any) =>
      `MEV allowed list manager has changed.\n` +
      `New manager: ${args.new_manager}`,
    severity: FindingSeverity.High,
  },
];
