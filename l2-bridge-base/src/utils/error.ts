export class NetworkError extends Error {
  constructor(e: unknown, name?: string) {
    super()

    if (name !== undefined) {
      this.name = name
    }

    if (e instanceof Error) {
      this.stack = e.stack
      this.message = e.message
    } else {
      this.message = `${e}`
    }
  }
}
