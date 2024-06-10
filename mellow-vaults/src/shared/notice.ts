import { ethers, Finding, FindingType, Log, LogDescription } from "forta-agent";
import { EventOfNotice } from '../entity/events'

export type TransactionEventContract = {
  addresses: {
    [key: string]: boolean
  }
  logs: Log[]
  filterLog: (eventAbi: string | string[], contractAddress?: string | string[]) => LogDescription[]
  to: string | null
  timestamp: number
}

export function handleEventsOfNotice(txEvent: TransactionEventContract, eventsOfNotice: EventOfNotice[]) {
  const out: Finding[] = []
  for (const eventInfo of eventsOfNotice) {
    if (!(eventInfo.address.toLowerCase() in txEvent.addresses)) {
      continue
    }
    const iface = new ethers.utils.Interface([{"inputs":[{"internalType":"address","name":"admin","type":"address"},{"internalType":"contract IVault","name":"vault_","type":"address"},{"internalType":"contract IERC20TvlModule","name":"erc20TvlModule_","type":"address"},{"internalType":"contract IDefaultBondModule","name":"bondModule_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"AccessControlBadConfirmation","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"bytes32","name":"neededRole","type":"bytes32"}],"name":"AccessControlUnauthorizedAccount","type":"error"},{"inputs":[],"name":"AddressZero","type":"error"},{"inputs":[],"name":"Forbidden","type":"error"},{"inputs":[],"name":"InvalidBond","type":"error"},{"inputs":[],"name":"InvalidCumulativeRatio","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address[]","name":"users","type":"address[]"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"DefaultBondStrategyProcessWithdrawals","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"components":[{"internalType":"address","name":"bond","type":"address"},{"internalType":"uint256","name":"ratioX96","type":"uint256"}],"indexed":false,"internalType":"struct IDefaultBondStrategy.Data[]","name":"data","type":"tuple[]"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"DefaultBondStrategySetData","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"previousAdminRole","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"newAdminRole","type":"bytes32"}],"name":"RoleAdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleRevoked","type":"event"},{"inputs":[],"name":"ADMIN_DELEGATE_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"DEFAULT_ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"OPERATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"Q96","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"bondModule","outputs":[{"internalType":"contract IDefaultBondModule","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"depositCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"erc20TvlModule","outputs":[{"internalType":"contract IERC20TvlModule","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleAdmin","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getRoleMember","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleMemberCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"isAdmin","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"isOperator","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"processAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"users","type":"address[]"}],"name":"processWithdrawals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"callerConfirmation","type":"address"}],"name":"renounceRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"requireAdmin","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"requireAtLeastOperator","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"components":[{"internalType":"address","name":"bond","type":"address"},{"internalType":"uint256","name":"ratioX96","type":"uint256"}],"internalType":"struct IDefaultBondStrategy.Data[]","name":"data","type":"tuple[]"}],"name":"setData","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"tokenToData","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vault","outputs":[{"internalType":"contract IVault","name":"","type":"address"}],"stateMutability":"view","type":"function"}])

    for (const log of txEvent.logs) {
      if (log.address.toLowerCase() !== eventInfo.address) {
        continue
      }
      try {
        const yourEvent = iface.parseLog(log)

        out.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(yourEvent.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(yourEvent.args) },
          }),
        )
      } catch (err) {

      }
    }
  }

  return out
}
