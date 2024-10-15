import {
    FindingSeverity,
    FindingType,
    HandleBlock,
    HandleTransaction,
    ethers,
} from '@fortanetwork/forta-bot'

export type EventOfNotice = {
    name: string
    address: string
    abi: string | string[]
    alertId: string
    description: CallableFunction
    severity: FindingSeverity
    type: FindingType
}

export type DeployedAddresses = {
    CS_MODULE: string
    CS_ACCOUNTING: string
    CS_FEE_DISTRIBUTOR: string
    CS_FEE_ORACLE: string
    CS_VERIFIER: string
    CS_EARLY_ADOPTION: string
    CS_GATE_SEAL: string
    LIDO_STETH: string
    BURNER: string
    HASH_CONSENSUS: string
    STAKING_ROUTER: string
}

interface Initialize {
    (blockIdentifier: ethers.BlockTag, provider: ethers.Provider): Promise<void>
}

export interface Service {
    handleTransaction?: HandleTransaction
    handleBlock?: HandleBlock
    initialize?: Initialize
    getName: () => string
}
