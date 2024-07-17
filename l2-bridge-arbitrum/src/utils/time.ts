export const SECONDS_60 = 60
// export const SECONDS_768 = 768
export const SECONDS_768 = 384

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
  let delayMin = Math.floor((sign * fullDelaySec) / SECONDS_60)
  const delaySec = sign * fullDelaySec - delayMin * SECONDS_60
  if (delayMin >= SECONDS_60) {
    delayHours = Math.floor(delayMin / SECONDS_60)
    delayMin -= delayHours * SECONDS_60
  }
  return (
    (sign == 1 ? '' : '-') +
    (delayHours > 0 ? `${delayHours} hrs ` : '') +
    (delayMin > 0 ? `${delayMin} min ` : '') +
    `${delaySec} sec`
  )
}

export function isWorkInterval(l1BlockTimesTamp: number, l2BlockTimesTamp: number): boolean {
  return -SECONDS_768 <= l2BlockTimesTamp - l1BlockTimesTamp && l2BlockTimesTamp - l1BlockTimesTamp <= SECONDS_60
}

export function toDate(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString()
}
