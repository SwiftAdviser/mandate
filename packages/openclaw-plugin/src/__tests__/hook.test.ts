import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@mandate.md/sdk', () => {
  const PolicyBlockedError = class extends Error {
    blockReason: string;
    declineMessage?: string;
    constructor(r: string, d?: string, dm?: string) {
      super(r);
      this.blockReason = r;
      this.declineMessage = dm;
    }
  };
  const CircuitBreakerError = class extends Error {
    statusCode = 403;
  };
  const MandateClient = vi.fn().mockImplementation(() => ({
    validate: vi.fn().mockResolvedValue({ allowed: true, intentId: 'id1' }),
    preflight: vi.fn().mockResolvedValue({ allowed: true, intentId: 'id1', action: 'transfer' }),
  }));
  const computeIntentHash = vi.fn().mockReturnValue('0xdeadbeef');
  return { MandateClient, PolicyBlockedError, CircuitBreakerError, computeIntentHash };
});

import { shouldIntercept, buildReason, preflightValidate } from '../hook.js';

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
    vi.clearAllMocks();
  });

  it('returns allowed:true when Mandate responds OK', async () => {
    const result = await preflightValidate('mndt_test_key', 'bankr_swap', { amount: '100' });
    expect(result.allowed).toBe(true);
  });

  it('returns allowed:false + blockReason on PolicyBlockedError', async () => {
    const { MandateClient } = await import('@mandate.md/sdk') as any;
    const { PolicyBlockedError } = await import('@mandate.md/sdk') as any;
    MandateClient.mockImplementationOnce(() => ({
      preflight: vi.fn().mockRejectedValueOnce(
        new PolicyBlockedError('per_tx_limit_exceeded', 'over limit', 'Split into smaller amounts'),
      ),
    }));

    const result = await preflightValidate('mndt_test_key', 'bankr_swap', { amount: '999' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('per_tx_limit_exceeded');
    expect(result.declineMessage).toBe('Split into smaller amounts');
  });

  it('returns allowed:false + circuit_breaker_active on CircuitBreakerError', async () => {
    const { MandateClient, CircuitBreakerError } = await import('@mandate.md/sdk') as any;
    MandateClient.mockImplementationOnce(() => ({
      preflight: vi.fn().mockRejectedValueOnce(new CircuitBreakerError()),
    }));

    const result = await preflightValidate('mndt_test_key', 'mandate_transfer', { to: '0xabc' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('circuit_breaker_active');
  });

  it('returns allowed:false + mandate_unreachable on network error (FAIL-CLOSED)', async () => {
    const { MandateClient } = await import('@mandate.md/sdk') as any;
    MandateClient.mockImplementationOnce(() => ({
      preflight: vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')),
    }));

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

  it('skips validation for non-financial tools (returns allowed:true, no API call)', async () => {
    const { MandateClient } = await import('@mandate.md/sdk') as any;
    MandateClient.mockClear();

    const result = await preflightValidate('mndt_test_key', 'Read', { file: 'test.ts' });
    expect(result.allowed).toBe(true);
    expect(MandateClient).not.toHaveBeenCalled();
  });
});
