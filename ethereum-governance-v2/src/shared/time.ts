export const ONE_HOUR = 60 * 60
export const ONE_DAY = 24 * ONE_HOUR
export const ONE_WEEK = 7 * ONE_DAY
export const ONE_MONTH = ONE_WEEK * 4
export const ONE_YEAR = 365 * ONE_DAY

export function formatTime(timeInMillis: number): string {
  const seconds = (timeInMillis / 1000).toFixed(3)
  return `${seconds} seconds`
}

export function elapsedTime(methodName: string, startTime: number): string {
  const elapsedTime = new Date().getTime() - startTime
  return `${methodName} started at ${formatTimeToHumanReadable(new Date(startTime))}. Elapsed: ${formatTime(
    elapsedTime,
  )}`
}

function formatTimeToHumanReadable(date: Date): string {
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}

export function formatDelay(fullDelaySec: number): string {
  const sign = fullDelaySec >= 0 ? 1 : -1
  let delayHours = 0
  let delayMin = Math.floor((sign * fullDelaySec) / 60)
  const delaySec = sign * fullDelaySec - delayMin * 60
  if (delayMin >= 60) {
    delayHours = Math.floor(delayMin / 60)
    delayMin -= delayHours * 60
  }
  return (
    (sign == 1 ? '' : '-') +
    (delayHours > 0 ? `${delayHours} hrs ` : '') +
    (delayMin > 0 ? `${delayMin} min ` : '') +
    `${delaySec} sec`
  )
}
