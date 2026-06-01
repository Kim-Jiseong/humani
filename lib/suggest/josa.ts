// Rule-based Korean 조사(postposition) stripper for the suggestion feature.
// Pure + dependency-free. Embeddings are fairly robust to 조사 variation, so we
// deliberately favor UNDER-stripping (leave the eojeol intact) over corrupting a
// noun. Only high-confidence case/auxiliary particles are listed; risky bare
// connectives (고/며/야/란/든/나/로) are intentionally excluded.

const RAW_PARTICLES = [
  // multi-syllable (unambiguous)
  '으로부터',
  '에서부터',
  '에게서',
  '한테서',
  '으로서',
  '으로써',
  '이라도',
  '이라고',
  '이나마',
  '이야말로',
  '에서',
  '에게',
  '한테',
  '께서',
  '처럼',
  '만큼',
  '보다',
  '마저',
  '조차',
  '부터',
  '까지',
  '마다',
  '밖에',
  '으로',
  '이나',
  '이란',
  '이든',
  '이라',
  '이며',
  '이고',
  // single-syllable case markers (high frequency, reasonably safe)
  '은',
  '는',
  '이',
  '가',
  '을',
  '를',
  '에',
  '의',
  '도',
  '만',
  '와',
  '과',
]

// Longest-first so e.g. "에서" matches before "에"/"서", "으로" before "로".
const PARTICLES = [...new Set(RAW_PARTICLES)].sort((a, b) => b.length - a.length)

const ENDS_HANGUL = /[가-힣]$/

/**
 * Strip a trailing 조사 from a single eojeol. Returns the stem, or the original
 * token when nothing safely strips (incl. non-Hangul tokens like latin/emoji).
 *   "여행을" → "여행", "면접에서" → "면접", "발표는" → "발표",
 *   "여행" → "여행", "를" → "를", "hello" → "hello"
 */
export function stripJosa(eojeol: string): string {
  const token = eojeol.trim()
  // Only attempt stripping when the token ends in a complete Hangul syllable.
  if (!token || !ENDS_HANGUL.test(token)) return token

  for (const p of PARTICLES) {
    // strict `>` keeps the particle itself intact (e.g. "를" stays "를")
    if (token.length > p.length && token.endsWith(p)) {
      const stem = token.slice(0, -p.length)
      if (stem.length >= 1 && ENDS_HANGUL.test(stem)) return stem
    }
  }
  return token
}
