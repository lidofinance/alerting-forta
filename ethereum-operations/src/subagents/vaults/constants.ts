import { ETH_DECIMALS } from "../../common/constants";

export const WITHDRAWAL_VAULT_ADDRESS =
  "0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f";
export const EL_VAULT_ADDRESS = "0x388C818CA8B9251b393131C08a736A67ccB19297";
export const BURNER_ADDRESS = "0xD15a672319Cf0352560eE76d9e89eAB0889046D3";
export const LIDO_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";

export const WITHDRAWAL_VAULT_BALANCE_DIFF_HIGH = ETH_DECIMALS.times(512);
export const WITHDRAWAL_VAULT_BALANCE_DIFF_INFO = ETH_DECIMALS.times(100);

export const EL_VAULT_BALANCE_DIFF_MEDIUM = ETH_DECIMALS.times(200);
export const EL_VAULT_BALANCE_DIFF_INFO = ETH_DECIMALS.times(50);

export const TRANSFER_SHARES_EVENT = `
    event TransferShares(
        address indexed from,
        address indexed to,
        uint256 sharesValue
    )
`;
