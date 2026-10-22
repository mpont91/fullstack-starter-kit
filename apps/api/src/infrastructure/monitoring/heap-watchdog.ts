import { getHeapStatistics } from 'node:v8'
import { ErrorReporter } from '../../domain/ports/error-reporter'

// Once a minute: a heap filling up is caught while there is still time.
const CHECK_MS = 60 * 1000
// Reported above this share of the heap's limit, and again only once usage
// has dropped below the second one, so a heap that stays high is one issue.
const ALERT_AT = 0.8
const REARM_AT = 0.7

export interface HeapUsage {
  used: number
  limit: number
}

const heapUsage = (): HeapUsage => {
  const { used_heap_size, heap_size_limit } = getHeapStatistics()
  return { used: used_heap_size, limit: heap_size_limit }
}

// Running out of heap kills the process outright: V8 aborts, no handler
// runs and nothing can be reported. So the warning has to come before. The
// limit V8 reports is the real ceiling only as Node sets it by default (in the
// container, 259 MB, reached at about 94% before dying): with
// --max-old-space-size it also counts young-generation space the heap never
// fills, and 80% would never come.
export class HeapWatchdog {
  private alerted = false

  constructor(
    private readonly errorReporter: ErrorReporter,
    private readonly usage: () => HeapUsage = heapUsage,
  ) {}

  start(): void {
    setInterval(() => this.check(), CHECK_MS).unref()
  }

  check(): void {
    const { used, limit } = this.usage()
    if (this.alerted) {
      if (used < limit * REARM_AT) this.alerted = false
      return
    }
    if (used > limit * ALERT_AT) {
      this.alerted = true
      const mb = (bytes: number) => Math.round(bytes / 1024 / 1024)
      this.errorReporter.report(
        new Error(`Heap at ${mb(used)} MB of its ${mb(limit)} MB limit`),
        'heap',
      )
    }
  }
}
