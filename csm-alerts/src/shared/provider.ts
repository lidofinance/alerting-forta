import { getProvider as getFortaProvider } from '@fortanetwork/forta-bot'
import { ScanEvmOptions } from '@fortanetwork/forta-bot/dist/scanning'

const FORTA_PUBKEY_FINGERPRINT = '3B0B3496AB884A1FF0159863C04D8ECD12AACC1D287544AF1665DCE26F55402F'
const DRPC_KEY_BASE64 = 'QWpGRUdOTHAwMDh0bkE0dmR4Um53ODRMVTl3dmk3d1I3N2gzVGdGa1ZwNWo='

export const RPC_OPTS: Omit<ScanEvmOptions, 'handleBlock' | 'handleTransaction'> = {
    rpcUrl: 'https://lb.drpc.org/ogrpc?network=ethereum',
    rpcKeyId: FORTA_PUBKEY_FINGERPRINT,
    rpcHeaders: { 'Drpc-Key': String(Buffer.from(DRPC_KEY_BASE64, 'base64')) },
    localRpcUrl: 'ethereum',
}

export async function getProvider() {
    return getFortaProvider({
        ...RPC_OPTS,
    })
}
