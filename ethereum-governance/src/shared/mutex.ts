import { Mutex, MutexInterface, withTimeout } from 'async-mutex'

export class DataRW<T> {
  private mutex: MutexInterface
  private value: T[]

  constructor(initialValue: T[]) {
    this.mutex = withTimeout(new Mutex(), 100)
    this.value = initialValue
  }

  async read(): Promise<T[]> {
    await this.mutex.acquire()
    try {
      const out = this.value
      this.value = []

      return out
    } finally {
      this.mutex.release()
    }
  }

  async write(newValue: T[]): Promise<void> {
    await this.mutex.acquire()
    try {
      this.value.push(...newValue)
    } finally {
      this.mutex.release()
    }
  }
}
