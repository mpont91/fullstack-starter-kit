import { z } from 'zod'

// Dates cross the wire as ISO 8601 strings; the API converts its `Date`s in
// its mappers.
export const isoDateSchema = z.iso.datetime()
