import { ETH_DECIMALS } from "../../common/constants";
import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  BURNER_ADDRESS as burnerAddress,
  WITHDRAWALS_VAULT_ADDRESS as wdVaultAddress,
  EL_REWARDS_VAULT_ADDRESS as elVaultAddress,
} from "../../common/constants";

export const WITHDRAWAL_VAULT_ADDRESS = wdVaultAddress;
export const EL_VAULT_ADDRESS = elVaultAddress;
export const BURNER_ADDRESS = burnerAddress;
export const LIDO_STETH_ADDRESS = lidoStethAddress;

export const WITHDRAWAL_VAULT_BALANCE_DIFF_INFO = ETH_DECIMALS.times(1000);
export const WITHDRAWAL_VAULT_BALANCE_BLOCK_INTERVAL = 100;

export const EL_VAULT_BALANCE_DIFF_INFO = ETH_DECIMALS.times(50);

export const TRANSFER_SHARES_EVENT = `
    event TransferShares(
        address indexed from,
        address indexed to,
        uint256 sharesValue
    )
`;
