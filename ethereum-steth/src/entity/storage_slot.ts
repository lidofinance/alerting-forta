export type StorageSlot = {
  id: number
  contractAddress: string
  contactName: string
  slotName: string
  slotAddress?: string
  isAddress: boolean
  isArray: boolean
  expected: string
}

export type StorageItemResponse = {
  slotId: number
  value: string
}

export type StorageArrayResponse = {
  slotId: number
  values: string[]
}
