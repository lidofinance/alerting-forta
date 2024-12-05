export type ProxyInfo = {
  name: string
  shortABI: string
}

export type NamedRole = {
  name: string
  hash: string
}

export type ContractRolesInfo = {
  name: string
  roles: Map<NamedRole, string[]>
}

export type OwnableContractInfo = {
  name: string
  ownershipMethod: string
}
