import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('mandate status', () => {
  it('returns intent status with CTA for reserved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        intentId: 'intent-1',
        status: 'reserved',
        txHash: null,
        blockNumber: null,
        gasUsed: null,
        amountUsd: null,
        decodedAction: null,
        summary: null,
        blockReason: null,
        requiresApproval: false,
        approvalId: null,
        expiresAt: null,
      }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve(['status', 'intent-1'], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('reserved');
    expect(output).toContain('mandate event');

    vi.unstubAllGlobals();
  });

  it('returns confirmed status with no CTA', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        intentId: 'intent-1',
        status: 'confirmed',
        txHash: '0xabc',
        blockNumber: '100',
        gasUsed: '50000',
        amountUsd: '10.00',
        decodedAction: 'transfer',
        summary: null,
        blockReason: null,
        requiresApproval: false,
        approvalId: null,
        expiresAt: null,
      }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve(['status', 'intent-1'], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('confirmed');
    expect(output).toContain('0xabc');
    // No next step for terminal state
    expect(output).not.toContain('mandate event');
    expect(output).not.toContain('mandate approve');

    vi.unstubAllGlobals();
  });

  it('shows approval CTA for approval_pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        intentId: 'intent-2',
        status: 'approval_pending',
        txHash: null,
        blockNumber: null,
        gasUsed: null,
        amountUsd: null,
        decodedAction: null,
        summary: null,
        blockReason: null,
        requiresApproval: true,
        approvalId: 'appr-1',
        expiresAt: null,
      }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve(['status', 'intent-2'], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('approval_pending');
    expect(output).toContain('mandate approve');

    vi.unstubAllGlobals();
  });
});
