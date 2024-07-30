export type L2BockSql = {
  id: number
  hash: string
  parent_hash: string
  timestamp: number
}

export class BlockDto {
  hash: string
  parentHash: string
  number: number
  timestamp: number

  constructor(hash: string, parentHash: string, number: number, timestamp: number) {
    this.hash = hash
    this.parentHash = parentHash
    this.number = number
    this.timestamp = timestamp
  }

  public toSqlObject(): L2BockSql {
    return toSqlObject(this)
  }
}

export function toSqlObject(l2BlockDto: BlockDto): L2BockSql {
  return {
    id: l2BlockDto.number,
    hash: l2BlockDto.hash,
    parent_hash: l2BlockDto.parentHash,
    timestamp: l2BlockDto.timestamp,
  }
}

export function sqlToL2Block(o: L2BockSql): BlockDto {
  return new BlockDto(o.hash, o.parent_hash, o.id, o.timestamp)
}
