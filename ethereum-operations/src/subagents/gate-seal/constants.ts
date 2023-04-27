import { ONE_DAY, ONE_MONTH, ONE_WEEK } from "../../common/constants";

export const GATE_SEAL_FACTORY_ADDRESS =
  "0x6c82877cac5a7a739f16ca0a89c0a328b8764a24";
export const GATE_SEAL_DEFAULT_ADDRESS =
  "0x150de3eca5b52db7bd80a6b094f73923d8d6fe0a";

export const WITHDRAWAL_QUEUE_ADDRESS =
  "0xa2ECee311e61EDaf4a3ac56b437FddFaCEd8Da80";
export const EXITBUS_ORACLE_ADDRESS =
  "0xAE5f30D1494a7B29A9a6D0D05072b6Fb092e7Ad2";

export const GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT =
  "event GateSealCreated (address gate_seal)";
export const GATE_SEAL_SEALED_EVENT =
  "event Sealed (address gate_seal, address sealed_by, uint256 sealed_for, address sealable, uint256 sealed_at)";

export const GATE_SEAL_WITHOUT_PAUSE_ROLE_TRIGGER_EVERY = ONE_DAY;

export const GATE_SEAL_EXPIRY_THRESHOLD = ONE_MONTH;
export const GATE_SEAL_EXPIRY_TRIGGER_EVERY = ONE_WEEK;
