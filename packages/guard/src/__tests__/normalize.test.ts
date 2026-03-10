import { describe, it, expect } from 'vitest';
import { normalize } from '../scanner/normalize.js';

describe('normalize', () => {
  it('performs NFC normalization', () => {
    // é as combining chars (e + combining accent) → precomposed
    const combining = 'e\u0301'; // NFD form
    const result = normalize(combining);
    expect(result).toBe('\u00e9'); // NFC form
  });

  it('strips zero-width space', () => {
    expect(normalize('ignore\u200bprevious')).toBe('ignoreprevious');
  });

  it('strips zero-width non-joiner', () => {
    expect(normalize('ignore\u200cprevious')).toBe('ignoreprevious');
  });

  it('strips zero-width joiner', () => {
    expect(normalize('ignore\u200dprevious')).toBe('ignoreprevious');
  });

  it('strips word joiner', () => {
    expect(normalize('ignore\u2060previous')).toBe('ignoreprevious');
  });

  it('strips BOM', () => {
    expect(normalize('\ufeffsystem')).toBe('system');
  });

  it('strips left-to-right mark', () => {
    expect(normalize('ignore\u200eprevious')).toBe('ignoreprevious');
  });

  it('strips right-to-left mark', () => {
    expect(normalize('ignore\u200fprevious')).toBe('ignoreprevious');
  });

  it('collapses multiple spaces to single space', () => {
    expect(normalize('ignore   previous   instructions')).toBe('ignore previous instructions');
  });

  it('collapses tabs and newlines in runs', () => {
    expect(normalize('ignore\t\nprevious')).toBe('ignore previous');
  });

  it('handles obfuscated injection attempt', () => {
    const obfuscated = 'ignore\u200b\u200c prev\u200bious instructions';
    const result = normalize(obfuscated);
    // Zero-width chars stripped; real space preserved → "ignore previous instructions"
    expect(result).toContain('ignore previous instructions');
    expect(result).not.toContain('\u200b');
    expect(result).not.toContain('\u200c');
  });

  it('preserves regular content unchanged', () => {
    const clean = 'Transfer 100 USDC to 0xabc123';
    expect(normalize(clean)).toBe(clean);
  });

  it('does NOT strip bidi override chars (inj_010 must see them)', () => {
    const bidi = 'hello\u202eworld';
    expect(normalize(bidi)).toContain('\u202e');
  });
});
