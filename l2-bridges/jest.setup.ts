import type { Config } from '@jest/types'
import { L2Network, skipNetwork } from './common/alert-bundles'
import { spawnTestNode } from './common/utils/test.helpers'
import { globalExtended, portsByNetwork, paramsByNetwork } from './common/utils/test.helpers'


module.exports = async function (globalConfig: Config.GlobalConfig, projectConfig: Config.ProjectConfig) {
  // TODO: run nodes in parallel
  globalExtended.testNodes = {}
  for (const network of Object.values(L2Network)) {
    if (network === L2Network.Default) { continue }
    if (skipNetwork(network)) { continue }
    // if (network === L2Network.Mantle) { continue }
    // if (network === L2Network.ZkSync) { continue }


    const params = paramsByNetwork[network]
    console.log(`\n`)
    const { nodeProcess, rpcUrl } = await spawnTestNode(
      params.L2_NETWORK_ID, params.L2_NETWORK_RPC, portsByNetwork[network]
    )
    globalExtended.testNodes[network] = {
      rpcUrl,
      process: nodeProcess,
    }
  }
}
