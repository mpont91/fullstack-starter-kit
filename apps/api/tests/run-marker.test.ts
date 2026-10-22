import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RunMarker } from '../src/infrastructure/monitoring/run-marker'
import { FakeErrorReporter } from './helpers/fake-error-reporter'

const dir = mkdtempSync(join(tmpdir(), 'run-marker-'))
after(() => rmSync(dir, { recursive: true, force: true }))

describe('the run marker', () => {
  it('reports nothing after a clean shutdown', () => {
    const path = join(dir, 'clean.running')
    const reporter = new FakeErrorReporter()
    const first = new RunMarker(path, reporter)
    first.start()
    first.stop()
    new RunMarker(path, reporter).start()

    assert.deepEqual(reporter.reports, [])
  })

  it('reports a run that ended without shutting down', () => {
    const path = join(dir, 'crashed.running')
    const reporter = new FakeErrorReporter()
    // Started, then died: stop() never ran.
    new RunMarker(path, reporter).start()
    new RunMarker(path, reporter).start()

    assert.equal(reporter.reports.length, 1)
    assert.equal(reporter.reports[0]!.where, 'crash')
    assert.match(
      (reporter.reports[0]!.error as Error).message,
      /^The API restarted after a run that didn't shut down \(started \d{4}-/,
    )
    // The new run is marked, so its own crash would be caught too.
    assert.ok(existsSync(path))
  })
})
