import { formatAddress } from 'forta-agent/dist/cli/utils'

// The function forta uses under the hood to normalize format of addresses in TransactionEvent.addresses
export const formatAddressAsForta = formatAddress
