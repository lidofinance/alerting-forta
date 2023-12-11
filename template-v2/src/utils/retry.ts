export const delay = (ms: number): Promise<unknown> =>
  new Promise((res) => setTimeout(res, ms))

export async function retry<T>(
  fn: () => Promise<T>,
  opts?: {
    attempts?: number
    wait?: number
    log?: (msg: string, obj: object) => void
  },
): Promise<T> {
  const { attempts = 3, wait = 15 * 1000, log } = opts || {}
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn()
    } catch (e: any) {
      ;(log || console.debug)(`Attempt (${attempt}/${attempts}):`, { error: e })
      if (attempt >= attempts) {
        throw e
      }
      attempt++
      await delay(wait)
    }
  }
}
