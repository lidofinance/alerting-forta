import { ONE_DAY, ONE_MONTH, ONE_WEEK } from "../../common/constants";
import {
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  EXITBUS_ORACLE_ADDRESS as ebOracleAddress,
  GATE_SEAL_FACTORY_ADDRESS as gsFactoryAddress,
  GATE_SEAL_DEFAULT_ADDRESS as gsAddress,
} from "../../common/constants";

export const GATE_SEAL_FACTORY_ADDRESS = gsFactoryAddress;
export const GATE_SEAL_DEFAULT_ADDRESS = gsAddress;

export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const EXITBUS_ORACLE_ADDRESS = ebOracleAddress;

export const GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT =
  "event GateSealCreated (address gate_seal)";
export const GATE_SEAL_SEALED_EVENT =
  "event Sealed (address gate_seal, address sealed_by, uint256 sealed_for, address sealable, uint256 sealed_at)";

export const GATE_SEAL_WITHOUT_PAUSE_ROLE_TRIGGER_EVERY = ONE_DAY;

export const GATE_SEAL_EXPIRY_THRESHOLD = ONE_MONTH;
export const GATE_SEAL_EXPIRY_TRIGGER_EVERY = ONE_WEEK;
