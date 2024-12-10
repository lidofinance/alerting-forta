import { SAFES } from 'constants/easy-track'
import { STONKS } from 'constants/stonks'
import { getSafeAddress, etherscanAddress } from '../../shared/string'
import { Blockchain } from '../../shared/contracts'

export const getMotionCreatorNamedLink = (address: string) => {
  const ethSafes = SAFES.Ethereum
  const safeName = ethSafes.find((safeData: string[]) => safeData[0].toLowerCase() === address.toLowerCase())
  if (safeName) {
    return getSafeAddress(address, safeName[1])
  } else {
    return etherscanAddress(address)
  }
}

export const getStonksContractInfo = (address: string) => {
  return STONKS.find((c) => c.address === address)
}

export const getSafeNameByAddress = (address: string) => {
  let safeName = address
  Object.keys(SAFES).forEach((key) => {
    const safe = SAFES[key as Blockchain].find(
      (safeData: string[]) => safeData[0].toLowerCase() === address.toLowerCase(),
    )
    if (safe) {
      safeName = safe[1]
      return
    }
  })
  return safeName
}
