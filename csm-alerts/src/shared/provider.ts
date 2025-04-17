import { getProvider as getFortaProvider } from '@fortanetwork/forta-bot'
import { ScanEvmOptions } from '@fortanetwork/forta-bot/dist/scanning'

export const RPC_OPTS: Omit<ScanEvmOptions, 'handleBlock' | 'handleTransaction'> = {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.drpc.org',
    localRpcUrl: 'ethereum',
}

export async function getProvider() {
    return getFortaProvider({
        ...RPC_OPTS,
    })
}
