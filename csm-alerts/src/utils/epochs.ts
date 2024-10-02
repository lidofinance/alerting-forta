import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '../shared/constants'

export function getEpoch(chainId: number, timestamp: number) {
  let genesisTimestamp: number | undefined

  switch (chainId) {
    case 1:
      genesisTimestamp = 1606824023
      break
    case 17_000:
      genesisTimestamp = 1695902400
      break
    default:
      throw Error(`Unsupported chain ${chainId} to get genesis timestamp`)
  }

  return Math.floor((timestamp - genesisTimestamp) / SECONDS_PER_SLOT / SLOTS_PER_EPOCH)
}
