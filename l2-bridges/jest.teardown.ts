import type { Config } from '@jest/types'
import { L2Network } from './common/alert-bundles'
import { globalExtended } from './common/utils/test.helpers'
import { stopTestNode } from './common/utils/test.helpers'


module.exports = async function (globalConfig: Config.GlobalConfig, projectConfig: Config.ProjectConfig) {
  // TODO: stop in parallel
  for (const network of Object.values(L2Network)) {
    if (globalExtended.testNodes[network]) {
      await stopTestNode(globalExtended.testNodes[network].process)
    }
  }
}
