import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shouldIntercept, buildReason, preflightValidate } from '../hook.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('shouldIntercept', () => {
  it('intercepts "bankr_swap"', () => {
    expect(shouldIntercept('bankr_swap', {})).toBe(true);
  });

  it('intercepts "bankr_prompt" with financial content', () => {
    expect(shouldIntercept('bankr_prompt', { prompt: 'Buy $50 ETH' })).toBe(true);
  });

  it('intercepts "mcp__wallet__transfer"', () => {
    expect(shouldIntercept('mcp__wallet__transfer', {})).toBe(true);
  });

  it('intercepts "mcp__locus__send"', () => {
    expect(shouldIntercept('mcp__locus__send', {})).toBe(true);
  });

  it('does NOT intercept "Read"', () => {
    expect(shouldIntercept('Read', {})).toBe(false);
  });

  it('does NOT intercept "Write" with no financial keywords', () => {
    expect(shouldIntercept('Write', { content: 'hello world' })).toBe(false);
  });

  it('intercepts tool with 0x address in input', () => {
    expect(shouldIntercept('execute', { target: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })).toBe(true);
  });

  it('intercepts "mandate_transfer"', () => {
    expect(shouldIntercept('mandate_transfer', {})).toBe(true);
  });

  it('intercepts tool with "buy" keyword in input', () => {
    expect(shouldIntercept('execute', { command: 'buy 100 USDC' })).toBe(true);
  });
});

describe('buildReason', () => {
  it('extracts Bankr prompt text as base reason', () => {
    const reason = buildReason({ prompt: 'Buy $50 ETH on Base' });
    expect(reason).toContain('Buy $50 ETH on Base');
  });

  it('prepends conversation context when available', () => {
    const reason = buildReason({ prompt: 'swap USDC' }, 'User asked to swap tokens');
    expect(reason).toMatch(/^User: User asked to swap tokens/);
    expect(reason).toContain('swap USDC');
  });

  it('truncates to 1000 chars', () => {
    const longInput = { prompt: 'x'.repeat(2000) };
    const reason = buildReason(longInput);
    expect(reason.length).toBeLessThanOrEqual(1000);
  });

  it('handles missing tool input gracefully', () => {
    const reason = buildReason(undefined);
    expect(typeof reason).toBe('string');
    expect(reason.length).toBeGreaterThan(0);
  });

  it('handles string input directly', () => {
    const reason = buildReason('Send 10 USDC to Alice');
    expect(reason).toContain('Send 10 USDC to Alice');
  });
});

describe('preflightValidate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns allowed:true when Mandate responds OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ allowed: true, intentId: 'id1' }),
    }));
    const result = await preflightValidate('mndt_test_key', 'bankr_swap', { amount: '100' });
    expect(result.allowed).toBe(true);
  });

  it('returns allowed:false + blockReason on 422', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 422,
      json: () => Promise.resolve({ blockReason: 'per_tx_limit_exceeded', declineMessage: 'Split into smaller amounts' }),
    }));
    const result = await preflightValidate('mndt_test_key', 'bankr_swap', { amount: '999' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('per_tx_limit_exceeded');
    expect(result.declineMessage).toBe('Split into smaller amounts');
  });

  it('returns allowed:false + circuit_breaker_active on 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 403,
      json: () => Promise.resolve({}),
    }));
    const result = await preflightValidate('mndt_test_key', 'mandate_transfer', { to: '0xabc' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('circuit_breaker_active');
  });

  it('returns allowed:false + mandate_unreachable on network error (FAIL-CLOSED)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const result = await preflightValidate('mndt_test_key', 'bankr_swap', {});
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('mandate_unreachable');
    expect(result.declineMessage).toContain('unreachable');
  });

  it('returns allowed:false + no_runtime_key when key empty', async () => {
    const result = await preflightValidate('', 'bankr_swap', { amount: '100' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('no_runtime_key');
  });

  it('skips validation for non-financial tools (returns allowed:true, no fetch)', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    const result = await preflightValidate('mndt_test_key', 'Read', { file: 'test.ts' });
    expect(result.allowed).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
