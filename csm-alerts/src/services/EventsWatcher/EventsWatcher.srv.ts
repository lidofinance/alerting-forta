import { Finding, TransactionEvent } from '@fortanetwork/forta-bot'
import { Logger } from 'winston'

import { handleEventsOfNotice } from '../../entity/events'
import { DeployedAddresses, EventOfNotice, Service } from '../../shared/types'
import { RedefineMode, requireWithTier } from '../../utils/require'
import * as Constants from '../constants'
import * as Events from './events'
import { getLogger } from '../../logger'

const { ALIASES, DEPLOYED_ADDRESSES, ORACLE_MEMBERS } = requireWithTier<typeof Constants>(
    module,
    '../constants',
    RedefineMode.Merge,
)

function asContract(key: keyof DeployedAddresses): { name: string; address: string } {
    return { name: ALIASES[key], address: DEPLOYED_ADDRESSES[key] }
}

const CSM_PROXY_CONTRACTS = [
    asContract('CS_MODULE'),
    asContract('CS_ACCOUNTING'),
    asContract('CS_FEE_DISTRIBUTOR'),
    asContract('CS_FEE_ORACLE'),
]

const CSM_ACL_CONTRACTS = [
    asContract('CS_MODULE'),
    asContract('CS_ACCOUNTING'),
    asContract('CS_FEE_DISTRIBUTOR'),
    asContract('CS_FEE_ORACLE'),
    asContract('HASH_CONSENSUS'),
]

const CSM_ASSET_RECOVERER_CONTRACTS = [
    asContract('CS_MODULE'),
    asContract('CS_ACCOUNTING'),
    asContract('CS_FEE_DISTRIBUTOR'),
    asContract('CS_FEE_ORACLE'),
]

const CSM_PAUSABLE_CONTRACTS = [
    asContract('CS_MODULE'),
    asContract('CS_ACCOUNTING'),
    asContract('CS_FEE_ORACLE'),
]

export class EventsWatcherSrv implements Service {
    private readonly logger: Logger

    private readonly eventsOfNotice: EventOfNotice[]

    constructor() {
        this.eventsOfNotice = [
            ...Events.getHashConsensusEvents(DEPLOYED_ADDRESSES.HASH_CONSENSUS, ORACLE_MEMBERS),
            ...Events.getCSFeeDistributorEvents(DEPLOYED_ADDRESSES.CS_FEE_DISTRIBUTOR),
            ...Events.getGateSealEvents(DEPLOYED_ADDRESSES.CS_GATE_SEAL, ALIASES),
            ...Events.getCSAccountingEvents(DEPLOYED_ADDRESSES.CS_ACCOUNTING),
            ...Events.getCSFeeOracleEvents(DEPLOYED_ADDRESSES.CS_FEE_ORACLE),
            ...Events.getCSModuleEvents(DEPLOYED_ADDRESSES.CS_MODULE),
            ...Events.getAssetRecovererEvents(CSM_ASSET_RECOVERER_CONTRACTS),
            ...Events.getOssifiedProxyEvents(CSM_PROXY_CONTRACTS),
            ...Events.getRolesMonitoringEvents(CSM_ACL_CONTRACTS),
            ...Events.getPausableEvents(CSM_PAUSABLE_CONTRACTS),
        ]

        this.logger = getLogger(this.getName())
    }

    getName() {
        return EventsWatcherSrv.name
    }

    public async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
        return handleEventsOfNotice(txEvent, this.eventsOfNotice)
    }
}
