/**
 * Preprocessing pipeline for injection scanning.
 * Strips invisible/zero-width Unicode and collapses whitespace.
 * Must NOT be applied before encoding_evasion patterns (run those on original text first).
 */
export function normalize(text: string): string {
  return text
    .normalize('NFC')
    // Strip zero-width and formatting chars (but NOT bidi overrides — those are detected by inj_010)
    .replace(/[\u200b-\u200f\u202a-\u202d\u2060-\u2064\ufeff]/g, '')
    // Collapse runs of whitespace to single space
    .replace(/\s{2,}/g, ' ');
}
