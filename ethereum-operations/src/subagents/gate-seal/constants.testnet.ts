import { ONE_HOUR } from "../../common/constants";
import {
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  EXITBUS_ORACLE_ADDRESS as ebOracleAddress,
  GATE_SEAL_FACTORY_ADDRESS as gsFactoryAddress,
  GATE_SEAL_DEFAULT_ADDRESS as gsAddress,
} from "../../common/constants.testnet";

export const GATE_SEAL_FACTORY_ADDRESS = gsFactoryAddress;
export const GATE_SEAL_DEFAULT_ADDRESS = gsAddress;

export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const EXITBUS_ORACLE_ADDRESS = ebOracleAddress;

export const GATE_SEAL_EXPIRY_TRIGGER_EVERY = 2 * ONE_HOUR;
