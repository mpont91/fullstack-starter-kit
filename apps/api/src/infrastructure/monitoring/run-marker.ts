import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { ErrorReporter } from '../../domain/ports/error-reporter'

// A file that exists while the API runs and is removed when it shuts down
// cleanly. Found on boot, it means the previous run died without shutting
// down (out of memory, a native crash, a kill), which nothing can report
// from inside the process that died. It lives in the container's own
// filesystem: a restart after a crash keeps it, a deploy starts afresh.
export class RunMarker {
  constructor(
    private readonly path: string,
    private readonly errorReporter: ErrorReporter,
  ) {}

  start(): void {
    if (existsSync(this.path)) {
      const startedAt = readFileSync(this.path, 'utf8')
      this.errorReporter.report(
        new Error(
          `The API restarted after a run that didn't shut down (started ${startedAt})`,
        ),
        'crash',
      )
    }
    writeFileSync(this.path, new Date().toISOString())
  }

  stop(): void {
    rmSync(this.path, { force: true })
  }
}
