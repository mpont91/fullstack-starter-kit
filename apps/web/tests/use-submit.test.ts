import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { useSubmit } from '../src/composables/use-submit'

describe('useSubmit', () => {
  it('is busy while the action runs, and free after', async () => {
    let release!: () => void
    const submit = useSubmit(() => new Promise<void>((r) => (release = r)), {
      errorMessage: () => 'failed',
    })
    const running = submit.run()
    assert.equal(submit.isBusy, true)
    release()
    assert.equal(await running, true)
    assert.equal(submit.isBusy, false)
    assert.equal(submit.error, '')
  })

  it("doesn't run twice at once", async () => {
    let calls = 0
    let release!: () => void
    const submit = useSubmit(
      () => {
        calls++
        return new Promise<void>((r) => (release = r))
      },
      { errorMessage: () => 'failed' },
    )
    const first = submit.run()
    assert.equal(await submit.run(), false)
    release()
    await first
    assert.equal(calls, 1)
  })

  it('tells a failure with what the action was given, and clears it on retry', async () => {
    let fail = true
    const submit = useSubmit(
      async (what: string) => {
        if (fail) throw new Error(`no ${what}`)
      },
      { errorMessage: (_, what) => `could not ${what}` },
    )
    assert.equal(await submit.run('save'), false)
    assert.equal(submit.error, 'could not save')
    assert.equal(submit.isBusy, false)
    fail = false
    assert.equal(await submit.run('save'), true)
    assert.equal(submit.error, '')
  })

  it('stays busy after a success that leaves the page', async () => {
    const submit = useSubmit(async () => {}, {
      navigates: true,
      errorMessage: () => 'failed',
    })
    await submit.run()
    assert.equal(submit.isBusy, true)
  })
})
