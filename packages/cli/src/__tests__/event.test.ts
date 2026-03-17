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

describe('mandate event', () => {
  it('posts txHash and returns success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'broadcasted' }),
    }));

    const { default: cli } = await import('../index.js');

    let output = '';
    await cli.serve(['event', 'intent-1', '--tx-hash', '0xdeadbeef'], {
      stdout(s: string) { output += s; },
      exit() {},
    });

    expect(output).toContain('posted');
    expect(output).toContain('true');
    expect(output).toContain('intent-1');
    expect(output).toContain('mandate status');

    vi.unstubAllGlobals();
  });

  it('sends correct POST request', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'broadcasted' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { default: cli } = await import('../index.js');

    await cli.serve(['event', 'intent-1', '--tx-hash', '0xdeadbeef'], {
      stdout() {},
      exit() {},
    });

    // Verify the POST to /api/intents/intent-1/events
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/intents/intent-1/events'),
      expect.objectContaining({ method: 'POST' }),
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.txHash).toBe('0xdeadbeef');

    vi.unstubAllGlobals();
  });
});
