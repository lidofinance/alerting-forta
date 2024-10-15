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
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
}

export function formatDelay(fullDelaySec: bigint | number): string {
    fullDelaySec = BigInt(fullDelaySec)

    if (fullDelaySec === 0n) {
        return '0 sec'
    }

    const sign = fullDelaySec >= 0 ? 1n : -1n
    fullDelaySec = sign * fullDelaySec

    let delayDays = 0n
    let delayHours = 0n

    let delayMin = fullDelaySec / 60n
    const delaySec = fullDelaySec - delayMin * 60n

    if (delayMin >= 60) {
        delayHours = delayMin / 60n
        delayMin -= delayHours * 60n
    }
    if (delayHours >= 24) {
        delayDays = delayHours / 24n
        delayHours -= delayDays * 24n
    }

    const delayString = [
        delayDays > 0 ? `${delayDays} day` : '',
        delayHours > 0 ? `${delayHours} hr` : '',
        delayMin > 0 ? `${delayMin} min` : '',
        delaySec > 0 ? `${delaySec} sec` : '',
    ]
        .filter(Boolean)
        .join(' ')

    return `${sign ? '' : '-'}${delayString}`
}
