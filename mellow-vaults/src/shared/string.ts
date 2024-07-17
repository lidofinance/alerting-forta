import { keccak256 } from 'forta-agent'
import { SafeTX, BLOCKCHAIN_INFO } from 'constants/common'

export function etherscanAddress(address: string): string {
  const subpath = process.env.FORTA_AGENT_RUN_TIER == 'testnet' ? 'goerli.' : ''
  return `[${address}](https://${subpath}etherscan.io/address/${address})`
}

export interface INamedRole {
  name: string
  hash: string
}

export const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

export function roleByName(name: string): INamedRole {
  let hash = keccak256(name)

  if (name === 'DEFAULT_ADMIN_ROLE') {
    hash = DEFAULT_ADMIN_ROLE
  }

  return {
    name: name.replace(/_/g, ' '),
    hash,
  }
}

export function getSafeLink(safeTx: SafeTX): string {
  return `[${safeTx.safeName}](${BLOCKCHAIN_INFO.safeUrlPrefix}${safeTx.safeAddress})`
}

export function getTxLink(safeTx: SafeTX): string {
  return `${BLOCKCHAIN_INFO.txUrlPrefix}${safeTx.tx}`
}

export function getSafeTxLink(safeTx: SafeTX): string {
  return `${BLOCKCHAIN_INFO.safeTxUrlPrefix}${safeTx.safeAddress}&id=multisig_${safeTx.safeAddress}_${safeTx.safeTx}`
}
