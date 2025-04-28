export type Topics = string[]
export type Logs = Log[]
export type Receipts = Receipt[]

export interface BlockEvent {
    number: number
    timestamp: number
    parentHash: string
    hash: string
    receipts: Receipts

    [k: string]: unknown
}

export interface Receipt {
    to?: string
    from: string
    logs: Logs
    transactionHash: string

    [k: string]: unknown
}

export interface Log {
    address: string
    topics: Topics
    data: string
    blockNumber: number
    transactionHash: string
    transactionIndex: number
    blockHash: string
    logIndex: number
    removed: boolean

    [k: string]: unknown
}

export type Severity = 'Unknown' | 'Info' | 'Low' | 'Medium' | 'High' | 'Critical'

export interface Finding {
    severity: Severity
    alertId: string
    name: string
    description: string
    uniqueKey: string
    blockTimestamp: number
    blockNumber?: number
    txHash?: string
    botName: string
    team: string

    [k: string]: unknown
}
