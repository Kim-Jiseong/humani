// Tunable config for the related-condition semantic word suggestion feature.
// Shared by the seed script, the /api/suggest route, and (model dim) the schema.

/**
 * Cosine-similarity gate (0..1). The top-1 match is shown only when its
 * similarity is >= this. This is the PRIMARY tuning knob — edit it here in code
 * (there is intentionally no UI control). Raise → fewer, tighter suggestions.
 */
export const SUGGEST_THRESHOLD = 0.62

/** Google embedding model (GA). 768 is a recommended Matryoshka dimension. */
export const EMBEDDING_MODEL_ID = 'gemini-embedding-001'

/** Must equal the `vector(N)` dimension in scenario-words.schema.sql. */
export const EMBEDDING_DIM = 768

/** Min Hangul length of the 조사-stripped stem before we bother embedding. */
export const MIN_QUERY_LEN = 1
