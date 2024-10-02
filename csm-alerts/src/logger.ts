import * as Winston from 'winston'

import { LOG_FORMAT, LOG_LEVEL } from './config'

export function getLogger(service: string) {
  return Winston.createLogger({
    format: Winston.format.combine(
      Winston.format.label({ label: service, message: true }),
      LOG_FORMAT === 'simple' ? Winston.format.simple() : Winston.format.json(),
    ),
    transports: [new Winston.transports.Console()],
    level: LOG_LEVEL,
  })
}
