import { describe, it, expect } from 'vitest';
import { searchHandler } from '../handlers/search.js';

describe('searchHandler', () => {
  it('returns validate schema for validate query', () => {
    const result = searchHandler('validate schema');
    expect(result.content[0].text).toContain('chainId');
    expect(result.content[0].text).toContain('intentHash');
  });

  it('returns policy docs for policy query', () => {
    const result = searchHandler('policy fields');
    expect(result.content[0].text).toContain('spendLimitPerTxUsd');
  });

  it('returns all docs for unknown query', () => {
    const result = searchHandler('everything');
    expect(result.content[0].text).toContain('validate');
    expect(result.content[0].text).toContain('register');
  });
});
