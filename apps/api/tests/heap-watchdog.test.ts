import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { HeapWatchdog } from '../src/infrastructure/monitoring/heap-watchdog'
import { FakeErrorReporter } from './helpers/fake-error-reporter'

const MB = 1024 * 1024

const watching = () => {
  const reporter = new FakeErrorReporter()
  const heap = { used: 0, limit: 100 * MB }
  return { reporter, heap, watchdog: new HeapWatchdog(reporter, () => heap) }
}

describe('the heap watchdog', () => {
  it('stays quiet below 80% of the limit', () => {
    const { reporter, heap, watchdog } = watching()
    heap.used = 79 * MB
    watchdog.check()
    assert.deepEqual(reporter.reports, [])
  })

  it('reports a heap past 80%, once while it stays high', () => {
    const { reporter, heap, watchdog } = watching()
    heap.used = 85 * MB
    watchdog.check()
    heap.used = 90 * MB
    watchdog.check()
    heap.used = 75 * MB
    watchdog.check()

    assert.equal(reporter.reports.length, 1)
    assert.equal(reporter.reports[0]!.where, 'heap')
    assert.equal(
      (reporter.reports[0]!.error as Error).message,
      'Heap at 85 MB of its 100 MB limit',
    )
  })

  it('reports again once usage has come down below 70%', () => {
    const { reporter, heap, watchdog } = watching()
    heap.used = 85 * MB
    watchdog.check()
    heap.used = 60 * MB
    watchdog.check()
    heap.used = 95 * MB
    watchdog.check()
    assert.equal(reporter.reports.length, 2)
  })
})
