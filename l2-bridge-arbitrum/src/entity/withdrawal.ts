export type WithdrawalSql = {
  block_number: number
  block_hash: string
  transaction_hash: string
  timestamp: number
  amount: number
}

export type WithdrawalStat = {
  total: number
  amount: number
}

export class WithdrawalDto {
  public readonly blockNumber: number
  public readonly blockNash: string
  public readonly transactionHash: string
  public readonly timestamp: number
  public readonly amount: number

  constructor(blockNumber: number, blockNash: string, transactionHash: string, timestamp: number, amount: number) {
    this.blockNumber = blockNumber
    this.blockNash = blockNash
    this.transactionHash = transactionHash
    this.timestamp = timestamp
    this.amount = amount
  }

  public toSqlObject(): WithdrawalSql {
    return toSqlObject(this)
  }
}

export function toSqlObject(obj: WithdrawalDto): WithdrawalSql {
  return {
    block_number: obj.blockNumber,
    block_hash: obj.blockNash,
    transaction_hash: obj.transactionHash,
    timestamp: obj.timestamp,
    amount: obj.amount,
  }
}

export function sqlToL2Block(o: WithdrawalSql): WithdrawalDto {
  return new WithdrawalDto(o.block_number, o.block_hash, o.transaction_hash, o.timestamp, o.amount)
}
