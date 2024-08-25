import { commonMain } from '../common/agent'
import { mantleConstants } from './config'


const main = async () => {
  await commonMain(mantleConstants)
}

main()
