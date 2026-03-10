import { describe, it, expect } from 'vitest';
import { SECRET_PATTERNS } from '../scanner/patterns/secrets.js';

function scanSecret(text: string, patternId: string): string | null {
  const p = SECRET_PATTERNS.find(pat => pat.id === patternId)!;
  if (p.custom) return p.custom(text);
  const m = p.pattern.exec(text);
  return m ? m[0] : null;
}

describe('secret patterns', () => {
  // ---- FIRE cases ----
  it('sec_001: detects private key near keyword', () => {
    const key = 'a'.repeat(64); // 64 hex chars
    expect(scanSecret(`private key: ${key}`, 'sec_001')).not.toBeNull();
  });

  it('sec_001: detects private key with "secret" keyword', () => {
    const key = 'deadbeef'.repeat(8); // 64 chars
    expect(scanSecret(`my secret: ${key}`, 'sec_001')).not.toBeNull();
  });

  it('sec_002: detects OpenAI API key', () => {
    expect(scanSecret('key=sk-abcdefghijklmnopqrst1234', 'sec_002')).not.toBeNull();
  });

  it('sec_003: detects Anthropic API key', () => {
    expect(scanSecret('ANTHROPIC_KEY=sk-ant-api03-abc123def456ghi789jkl012', 'sec_003')).not.toBeNull();
  });

  it('sec_004: detects Bearer token', () => {
    expect(scanSecret('Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9abc123', 'sec_004')).not.toBeNull();
  });

  it('sec_005: detects AWS Access Key ID', () => {
    expect(scanSecret('AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE', 'sec_005')).not.toBeNull();
  });

  it('sec_006: detects AWS secret with keyword', () => {
    const secret = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    expect(scanSecret(`aws_secret_access_key=${secret}`, 'sec_006')).not.toBeNull();
  });

  it('sec_007: detects GitHub PAT (ghs_ prefix)', () => {
    expect(scanSecret('token=ghs_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890', 'sec_007')).not.toBeNull();
  });

  it('sec_007: detects GitHub PAT (ghp_ prefix)', () => {
    // 40 chars after ghp_ prefix (standard GitHub PAT length)
    expect(scanSecret('GH_TOKEN=ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890123456', 'sec_007')).not.toBeNull();
  });

  it('sec_008: detects BIP39 12-word mnemonic', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    expect(scanSecret(mnemonic, 'sec_008')).not.toBeNull();
  });

  it('sec_009: detects Luhn-valid credit card number', () => {
    // Visa test number: 4111 1111 1111 1111
    expect(scanSecret('Card: 4111 1111 1111 1111', 'sec_009')).not.toBeNull();
  });

  it('sec_010: detects JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(scanSecret(jwt, 'sec_010')).not.toBeNull();
  });

  // ---- CLEAN cases ----
  it('sec_001: does NOT flag tx hash (no keyword)', () => {
    const txHash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    expect(scanSecret(`txHash: ${txHash}`, 'sec_001')).toBeNull();
  });

  it('sec_001: does NOT flag 64-char hex without keyword', () => {
    const hex = 'deadbeef'.repeat(8);
    expect(scanSecret(`data: ${hex}`, 'sec_001')).toBeNull();
  });

  it('sec_006: does NOT flag 40-char string without aws keyword', () => {
    expect(scanSecret('some 40 char string abcdefghijklmnopqrstuvwxyz1234', 'sec_006')).toBeNull();
  });

  it('sec_008: does NOT flag normal English prose', () => {
    expect(scanSecret('the quick brown fox jumps over the lazy dog in the park', 'sec_008')).toBeNull();
  });

  it('sec_009: does NOT flag Luhn-invalid number', () => {
    // 4111 1111 1111 1112 — one digit off, fails Luhn
    expect(scanSecret('invalid: 4111 1111 1111 1112', 'sec_009')).toBeNull();
  });

  // ---- Luhn edge cases ----
  it('sec_009: detects Mastercard test number', () => {
    // 5500 0000 0000 0004
    expect(scanSecret('MC: 5500 0000 0000 0004', 'sec_009')).not.toBeNull();
  });
});
