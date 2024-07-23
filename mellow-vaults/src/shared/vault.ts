import { VAULT_LIST } from 'constants/common'

export const getVaultByAddress = (address: string) => VAULT_LIST.find((vault) => vault.defaultBondStrategy === address)
