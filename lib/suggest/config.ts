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

/** Vector search fetch size. We pull one extra so we can drop the query word
 *  itself (when it's the closest match) and still show SUGGEST_COUNT words. */
export const SUGGEST_TOPK = 7

/** Words shown above the input (rendered as 2 rows × 3). */
export const SUGGEST_COUNT = 6
