import { BlockEvent, Finding, FindingSeverity, FindingType, ethers } from '@fortanetwork/forta-bot'
import { Logger } from 'winston'

import { IS_CLI } from '../../config'
import { GateSeal__factory } from '../../generated/typechain'
import { getLogger } from '../../logger'
import { SECONDS_PER_DAY } from '../../shared/constants'
import { Service } from '../../shared/types'
import { RedefineMode, requireWithTier } from '../../utils/require'
import { formatDelay } from '../../utils/time'
import * as Constants from '../constants'

const { DEPLOYED_ADDRESSES } = requireWithTier<typeof Constants>(
    module,
    '../constants',
    RedefineMode.Merge,
)

const EXPIRATION_CHECK_INTERVAL_BLOCKS = 601
const EXPIRATION_TIME_LEFT_SEC_MIN = SECONDS_PER_DAY * 28 * 3

export class GateSealSrv implements Service {
    private readonly logger: Logger

    private readonly lastFiredAt = {
        gateSealExpired: 0,
    }

    constructor() {
        this.logger = getLogger(this.getName())
    }

    getName() {
        return GateSealSrv.name
    }

    public async handleBlock(
        blockEvent: BlockEvent,
        provider: ethers.Provider,
    ): Promise<Finding[]> {
        if (blockEvent.blockNumber % EXPIRATION_CHECK_INTERVAL_BLOCKS !== 0 && !IS_CLI) {
            return []
        }

        const gs = GateSeal__factory.connect(DEPLOYED_ADDRESSES.CS_GATE_SEAL, provider)
        const expiresAt = await gs.get_expiry_timestamp({
            blockTag: blockEvent.blockHash,
        })

        const now = blockEvent.block.timestamp
        const expiresInSec = BigInt(now) - expiresAt
        const isExpired = now <= expiresAt

        if (isExpired || expiresInSec > EXPIRATION_TIME_LEFT_SEC_MIN) {
            return []
        }

        const out: Finding[] = []

        if (now - this.lastFiredAt.gateSealExpired > SECONDS_PER_DAY * 7) {
            const f = Finding.fromObject({
                name: `🔴 CSM GateSeal expires soon.`,
                description: `CSM GateSeal expires in ${formatDelay(expiresInSec)}`,
                alertId: 'CS-GATE-SEAL-EXPIRES-SOON',
                // NOTE: Do not include the source to reach quorum.
                // source: sourceFromEvent(blockEvent),
                severity: FindingSeverity.High,
                type: FindingType.Info,
            })
            out.push(f)
            this.lastFiredAt.gateSealExpired = now
        }

        return out
    }
}
