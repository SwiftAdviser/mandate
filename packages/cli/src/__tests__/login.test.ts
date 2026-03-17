import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs');
vi.mock('node:os');

import * as fs from 'node:fs';
import * as os from 'node:os';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(os.homedir).mockReturnValue('/home/test');
  vi.mocked(fs.existsSync).mockReturnValue(false);
  vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
  vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  vi.mocked(fs.chmodSync).mockReturnValue(undefined);
});

describe('mandate login', () => {
  it('registers agent and returns credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        agentId: 'uuid-1',
        runtimeKey: 'mndt_test_abc123xyz',
        claimUrl: 'https://app.mandate.md/claim/uuid-1',
        evmAddress: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 84532,
      }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve(['login', '--name', 'TestAgent', '--address', '0x1234567890abcdef1234567890abcdef12345678'], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('uuid-1');
    expect(output).toContain('mndt_test_abc');
    expect(output).not.toContain('mndt_test_abc123xyz'); // masked
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.chmodSync).toHaveBeenCalledWith(expect.stringContaining('credentials.json'), 0o600);

    vi.unstubAllGlobals();
  });

  it('passes defaultPolicy when limits provided', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        agentId: 'uuid-2',
        runtimeKey: 'mndt_test_xyz789abc',
        claimUrl: 'https://app.mandate.md/claim/uuid-2',
        evmAddress: '0x0000000000000000000000000000000000000000',
        chainId: 84532,
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { default: cli } = await import('../index.js');

    await cli.serve(['login', '--name', 'LimitAgent', '--per-tx-limit', '100', '--daily-limit', '500'], {
      stdout() {},
      exit() {},
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.defaultPolicy.spendLimitPerTxUsd).toBe(100);
    expect(body.defaultPolicy.spendLimitPerDayUsd).toBe(500);

    vi.unstubAllGlobals();
  });
});
