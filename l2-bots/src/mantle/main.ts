import { commonMain } from '../common/agent'
import { mantleConstants } from './config'


const main = async () => {
  console.debug({ mantleConstants })
  await commonMain(mantleConstants)
}

main()
