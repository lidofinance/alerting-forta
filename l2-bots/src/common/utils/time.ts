export const SECOND_MS = 1000

export const SECONDS_60 = 60
export const SECONDS_768 = 768

export function formatTime(timeInMillis: number): string {
  const seconds = (timeInMillis / 1000).toFixed(3)
  return `${seconds} seconds`
}

export function elapsed(startTime: number): string {
  return formatTime(new Date().getTime() - startTime)
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
