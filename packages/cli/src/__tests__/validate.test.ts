import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeIntentHash } from '@mandate.md/sdk';

vi.mock('node:fs');
vi.mock('node:os');

import * as fs from 'node:fs';
import * as os from 'node:os';

const CREDS = {
  runtimeKey: 'mndt_test_abc123',
  agentId: 'uuid-1',
  claimUrl: 'http://x',
  chainId: 84532,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(os.homedir).mockReturnValue('/home/test');
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(CREDS));
});

describe('mandate validate (preflight, default)', () => {
  it('calls /api/validate with action-based payload', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        allowed: true,
        intentId: 'intent-pf1',
        requiresApproval: false,
        approvalId: null,
        blockReason: null,
        action: 'transfer',
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve([
      'validate',
      '--action', 'transfer',
      '--amount', '10',
      '--to', '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      '--token', 'USDC',
      '--reason', 'Invoice #42',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    // Verify preflight payload sent to /api/validate
    const [url, reqInit] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/validate');
    expect(url).not.toContain('/api/validate/raw');

    const body = JSON.parse(reqInit.body);
    expect(body.action).toBe('transfer');
    expect(body.amount).toBe('10');
    expect(body.to).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect(body.token).toBe('USDC');
    expect(body.reason).toBe('Invoice #42');
    // No EVM fields in preflight
    expect(body.intentHash).toBeUndefined();
    expect(body.nonce).toBeUndefined();

    expect(output).toContain('intent-pf1');
    expect(output).toContain('ok');

    vi.unstubAllGlobals();
  });

  it('returns blocked output on PolicyBlockedError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        blockReason: 'per_tx_limit_exceeded',
        blockDetail: '$150 exceeds $100/tx limit',
      }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve([
      'validate',
      '--action', 'transfer',
      '--reason', 'Big payment',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('POLICY_BLOCKED');
    expect(output).toContain('per_tx_limit_exceeded');

    vi.unstubAllGlobals();
  });

  it('returns approval required output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        allowed: true,
        intentId: 'intent-2',
        requiresApproval: true,
        approvalId: 'approval-1',
        blockReason: null,
        action: 'transfer',
      }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve([
      'validate',
      '--action', 'transfer',
      '--reason', 'Big payment needing approval',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('requiresApproval');
    expect(output).toContain('intent-2');
    expect(output).toContain('approve');

    vi.unstubAllGlobals();
  });
});

describe('mandate validate --raw', () => {
  it('computes intentHash and calls /api/validate/raw', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        allowed: true,
        intentId: 'intent-raw1',
        requiresApproval: false,
        approvalId: null,
        blockReason: null,
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve([
      'validate',
      '--raw',
      '--to', '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      '--nonce', '42',
      '--gas-limit', '90000',
      '--max-fee-per-gas', '1000000000',
      '--max-priority-fee-per-gas', '1000000000',
      '--reason', 'Invoice #127',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    const [url, reqInit] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/validate/raw');

    const body = JSON.parse(reqInit.body);
    expect(body.intentHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(body.nonce).toBe(42);
    expect(body.gasLimit).toBe('90000');

    // Verify intentHash matches computed value
    const expected = computeIntentHash({
      chainId: 84532,
      nonce: 42,
      to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
      calldata: '0x',
      valueWei: '0',
      gasLimit: '90000',
      maxFeePerGas: '1000000000',
      maxPriorityFeePerGas: '1000000000',
    });
    expect(body.intentHash).toBe(expected);

    expect(output).toContain('intent-raw1');
    expect(output).toContain('ok');

    vi.unstubAllGlobals();
  });

  it('returns blocked output on PolicyBlockedError in raw mode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        blockReason: 'per_tx_limit_exceeded',
        blockDetail: '$150 exceeds $100/tx limit',
      }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve([
      'validate',
      '--raw',
      '--to', '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      '--nonce', '1',
      '--gas-limit', '90000',
      '--max-fee-per-gas', '1000000000',
      '--max-priority-fee-per-gas', '1000000000',
      '--reason', 'Big payment',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('POLICY_BLOCKED');
    expect(output).toContain('per_tx_limit_exceeded');

    vi.unstubAllGlobals();
  });
});

describe('mandate validate auth', () => {
  it('requires auth middleware (no creds = error)', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { default: cli } = await import('../index.js');

    let output = '';
    let exitCode: number | undefined;
    await cli.serve([
      'validate',
      '--action', 'transfer',
      '--reason', 'Test',
    ], {
      stdout(s: string) { output += s; },
      exit(code: number) { exitCode = code; },
    });

    expect(output).toContain('NOT_AUTHENTICATED');
  });
});
