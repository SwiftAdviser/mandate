import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadCredentials, saveCredentials, updateCredentials } from '../credentials.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('node:fs');
vi.mock('node:os');

const CREDS_DIR = '/home/test/.mandate';
const CREDS_PATH = '/home/test/.mandate/credentials.json';

beforeEach(() => {
  vi.mocked(os.homedir).mockReturnValue('/home/test');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadCredentials', () => {
  it('returns null when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(loadCredentials()).toBeNull();
  });

  it('returns parsed credentials when file exists', () => {
    const creds = { runtimeKey: 'mndt_test_abc', agentId: 'uuid-1', claimUrl: 'http://x' };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(creds));

    const result = loadCredentials();
    expect(result).toEqual(creds);
    expect(fs.readFileSync).toHaveBeenCalledWith(CREDS_PATH, 'utf-8');
  });

  it('returns null on parse error', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('not json');

    expect(loadCredentials()).toBeNull();
  });
});

describe('saveCredentials', () => {
  it('creates directory and writes file with chmod 600', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.chmodSync).mockReturnValue(undefined);

    const creds = { runtimeKey: 'mndt_test_abc', agentId: 'uuid-1', claimUrl: 'http://x' };
    saveCredentials(creds);

    expect(fs.mkdirSync).toHaveBeenCalledWith(CREDS_DIR, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(CREDS_PATH, JSON.stringify(creds, null, 2));
    expect(fs.chmodSync).toHaveBeenCalledWith(CREDS_PATH, 0o600);
  });
});

describe('updateCredentials', () => {
  it('merges partial into existing credentials', () => {
    const existing = { runtimeKey: 'mndt_test_abc', agentId: 'uuid-1', claimUrl: 'http://x' };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existing));
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.chmodSync).mockReturnValue(undefined);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(os.homedir).mockReturnValue('/home/test');

    updateCredentials({ evmAddress: '0xabc' });

    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.runtimeKey).toBe('mndt_test_abc');
    expect(written.evmAddress).toBe('0xabc');
  });

  it('throws when no existing credentials', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => updateCredentials({ evmAddress: '0xabc' })).toThrow();
  });
});
