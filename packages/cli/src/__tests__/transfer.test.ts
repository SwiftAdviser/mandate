import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encodeFunctionData, parseAbi } from 'viem';
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

describe('mandate transfer (preflight, default)', () => {
  it('calls /api/validate with action-based payload', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        allowed: true,
        intentId: 'intent-t1',
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
      'transfer',
      '--to', '0x1234567890abcdef1234567890abcdef12345678',
      '--amount', '10000000',
      '--token', '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      '--reason', 'Invoice #127',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    // Verify preflight payload
    const [url, reqInit] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/validate');
    expect(url).not.toContain('/api/validate/raw');

    const body = JSON.parse(reqInit.body);
    expect(body.action).toBe('transfer');
    expect(body.amount).toBe('10000000');
    expect(body.to).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(body.token).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect(body.reason).toBe('Invoice #127');
    // No EVM fields in preflight
    expect(body.intentHash).toBeUndefined();
    expect(body.nonce).toBeUndefined();

    expect(output).toContain('intent-t1');
    expect(output).toContain('ok');

    vi.unstubAllGlobals();
  });

  it('supports optional --chain flag', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        allowed: true,
        intentId: 'intent-t2',
        requiresApproval: false,
        approvalId: null,
        blockReason: null,
        action: 'transfer',
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { default: cli } = await import('../index.js');

    await cli.serve([
      'transfer',
      '--to', '0x1234567890abcdef1234567890abcdef12345678',
      '--amount', '5000000',
      '--token', 'USDC',
      '--reason', 'Test',
      '--chain', 'base-sepolia',
    ], {
      stdout() {},
      exit() {},
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.chain).toBe('base-sepolia');

    vi.unstubAllGlobals();
  });

  it('returns blocked output on policy violation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        blockReason: 'daily_limit_exceeded',
      }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve([
      'transfer',
      '--to', '0x1234567890abcdef1234567890abcdef12345678',
      '--amount', '99999999999',
      '--token', '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      '--reason', 'Huge transfer',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('POLICY_BLOCKED');
    expect(output).toContain('daily_limit_exceeded');

    vi.unstubAllGlobals();
  });
});

describe('mandate transfer --raw', () => {
  it('encodes ERC20 calldata and calls /api/validate/raw', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        allowed: true,
        intentId: 'intent-raw-t1',
        requiresApproval: false,
        approvalId: null,
        blockReason: null,
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve([
      'transfer',
      '--raw',
      '--to', '0x1234567890abcdef1234567890abcdef12345678',
      '--amount', '10000000',
      '--token', '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      '--reason', 'Invoice #127',
      '--nonce', '42',
      '--max-fee-per-gas', '1000000000',
      '--max-priority-fee-per-gas', '1000000000',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    const [url, reqInit] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/validate/raw');

    const body = JSON.parse(reqInit.body);
    expect(body.calldata).toContain('0xa9059cbb'); // transfer selector
    expect(body.to).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e'); // token contract
    expect(body.intentHash).toMatch(/^0x[a-f0-9]{64}$/);

    expect(output).toContain('intent-raw-t1');
    expect(output).toContain('unsignedTx');
    expect(output).toContain('calldata');

    vi.unstubAllGlobals();
  });
});
