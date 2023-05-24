import { ONE_DAY, ONE_MONTH, ONE_WEEK } from "../../common/constants";
import { WITHDRAWAL_QUEUE_ADDRESS as wqAddress } from "../../common/constants";

export const GATE_SEAL_FACTORY_ADDRESS =
  "0x6c82877cac5a7a739f16ca0a89c0a328b8764a24";
export const GATE_SEAL_DEFAULT_ADDRESS =
  "0x1ad5cb2955940f998081c1ef5f5f00875431aa90";

export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const EXITBUS_ORACLE_ADDRESS =
  "0x0De4Ea0184c2ad0BacA7183356Aea5B8d5Bf5c6e";

export const GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT =
  "event GateSealCreated (address gate_seal)";
export const GATE_SEAL_SEALED_EVENT =
  "event Sealed (address gate_seal, address sealed_by, uint256 sealed_for, address sealable, uint256 sealed_at)";

export const GATE_SEAL_WITHOUT_PAUSE_ROLE_TRIGGER_EVERY = ONE_DAY;

export const GATE_SEAL_EXPIRY_THRESHOLD = ONE_MONTH;
export const GATE_SEAL_EXPIRY_TRIGGER_EVERY = ONE_WEEK;
