import { Mutex } from 'async-mutex'
import { Finding } from 'forta-agent'

export class FindingsRW {
  private mutex: Mutex
  private value: Finding[]

  constructor(initialValue: Finding[]) {
    this.mutex = new Mutex()
    this.value = initialValue
  }

  async read(): Promise<Finding[]> {
    await this.mutex.acquire()
    try {
      const out = this.value
      this.value = []

      return out
    } finally {
      this.mutex.release()
    }
  }

  async write(newValue: Finding[]): Promise<void> {
    await this.mutex.acquire()
    try {
      this.value.push(...newValue)
    } finally {
      this.mutex.release()
    }
  }
}
