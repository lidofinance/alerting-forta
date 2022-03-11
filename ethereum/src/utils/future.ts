export interface Future<T = any> {
  reset: () => void
  resolve: (value: T) => void
  promise: Promise<T>
}

const EMPTY_PROMISE = new Promise<void>(r => r())

export function makeFuture<T>(): Future<T> {
  let future: Future<T> = {
    reset: () => {
      future.promise = new Promise<T>(resolve => {
        future.resolve = resolve
      })
    },
    resolve: (value: T) => {
      future.resolve(value)
    },
    promise: (EMPTY_PROMISE as unknown) as Promise<T>
  }

  future.reset()

  return future
}
