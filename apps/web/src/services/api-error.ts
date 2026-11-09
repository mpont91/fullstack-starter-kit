// Apart from the client, so code that only reads a failure (the error
// helper, its tests) doesn't need the API's URL.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
