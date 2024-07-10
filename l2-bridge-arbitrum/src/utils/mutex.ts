import { Mutex, MutexInterface, withTimeout } from 'async-mutex'

export class ArrRW<T> {
  private mutex: MutexInterface
  private value: T[]

  constructor(initialValue: T[]) {
    this.mutex = withTimeout(new Mutex(), 100)
    this.value = initialValue
  }

  async read(): Promise<T[]> {
    await this.mutex.waitForUnlock()
    await this.mutex.acquire()
    let out: T[]
    try {
      out = this.value
    } finally {
      this.mutex.release()
    }

    return out
  }

  async write(newValue: T[]): Promise<void> {
    await this.mutex.waitForUnlock()
    await this.mutex.acquire()
    try {
      this.value.push(...newValue)
    } finally {
      this.mutex.release()
    }
  }

  async clear(): Promise<void> {
    await this.mutex.waitForUnlock()
    await this.mutex.acquire()
    try {
      this.value = []
    } finally {
      this.mutex.release()
    }
  }
}
