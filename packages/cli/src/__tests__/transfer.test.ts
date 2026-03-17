import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encodeFunctionData, parseAbi } from 'viem';

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

describe('mandate transfer', () => {
  it('encodes ERC20 calldata and validates', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        allowed: true,
        intentId: 'intent-t1',
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

    // Verify the request body has encoded calldata
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.calldata).toContain('0xa9059cbb'); // transfer selector
    expect(body.to).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e'); // token contract, not recipient

    expect(output).toContain('intent-t1');
    expect(output).toContain('unsignedTx');
    expect(output).toContain('calldata');

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
      '--nonce', '1',
      '--max-fee-per-gas', '1000000000',
      '--max-priority-fee-per-gas', '1000000000',
    ], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('POLICY_BLOCKED');
    expect(output).toContain('daily_limit_exceeded');

    vi.unstubAllGlobals();
  });
});
