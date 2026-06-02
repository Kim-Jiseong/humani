// Display formatting for dashboard numbers. Pure — safe on server or client.

/** Round to a fixed number of decimals. */
export function round(n: number, decimals = 2): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

/** Fixed-decimal number with thousands separators. e.g. 1197.75 → "1,197.75". */
export function formatNum(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Integer with thousands separators. */
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/**
 * Milliseconds → detailed string with 2 decimals + thousands separators.
 * e.g. 499 → "499.00ms", 14373 → "14,373.00ms".
 */
export function formatMs(ms: number, decimals = 2): string {
  return `${formatNum(ms, decimals)}ms`
}

/** Milliseconds → seconds with 2 decimals. e.g. 1197.75 → "1.20s". */
export function formatSec(ms: number, decimals = 2): string {
  return `${formatNum(ms / 1000, decimals)}s`
}

/** ms with a seconds hint once it's at least a second. "1,197.75ms · 1.20s". */
export function formatMsLong(ms: number): string {
  return ms >= 1000 ? `${formatMs(ms)} · ${formatSec(ms)}` : formatMs(ms)
}

/** Ratio (0..1) → percentage string. e.g. 0.5 → "50.00%". */
export function formatPct(ratio: number, decimals = 2): string {
  return `${formatNum(ratio * 100, decimals)}%`
}
