import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs so keyStore doesn't touch real disk
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(''),
  writeFileSync: vi.fn(),
}));

vi.mock('@mandate.md/sdk', () => {
  const PolicyBlockedError = class extends Error {
    blockReason: string;
    declineMessage?: string;
    constructor(r: string, _d?: string, dm?: string) { super(r); this.blockReason = r; this.declineMessage = dm; }
  };
  const CircuitBreakerError = class extends Error { statusCode = 403; };
  const MandateClient = vi.fn().mockImplementation(() => ({
    validate: vi.fn().mockResolvedValue({ allowed: true, intentId: 'id1' }),
    preflight: vi.fn().mockResolvedValue({ allowed: true, intentId: 'id1', action: 'transfer' }),
    getStatus: vi.fn().mockResolvedValue({ status: 'confirmed', txHash: '0xabc' }),
  }));
  (MandateClient as any).register = vi.fn().mockResolvedValue({
    agentId: 'ag1', runtimeKey: 'mndt_test_new', claimUrl: 'https://app.mandate.md/claim/x',
    evmAddress: '0x1234', chainId: 8453,
  });
  const computeIntentHash = vi.fn().mockReturnValue('0xdeadbeef');
  return { MandateClient, PolicyBlockedError, CircuitBreakerError, computeIntentHash };
});

import mandatePlugin from '../plugin.js';
import { clearKeyCache } from '../keyStore.js';

beforeEach(() => {
  clearKeyCache();
});

describe('openclaw plugin', () => {
  it('exports plugin with correct name and tools', () => {
    expect(mandatePlugin.name).toBe('Mandate');
    expect(mandatePlugin.tools).toHaveLength(3);
  });

  it('tools are register, validate, status', () => {
    const names = mandatePlugin.tools.map(t => t.name);
    expect(names).toContain('mandate_register');
    expect(names).toContain('mandate_validate');
    expect(names).toContain('mandate_status');
  });

  it('validate tool has action as required param', () => {
    const vt = mandatePlugin.tools.find(t => t.name === 'mandate_validate')!;
    expect(vt.parameters.required).toContain('action');
    expect(vt.parameters.properties).not.toHaveProperty('privateKey');
  });

  it('register tool has name and evmAddress as required', () => {
    const rt = mandatePlugin.tools.find(t => t.name === 'mandate_register')!;
    expect(rt.parameters.required).toContain('name');
    expect(rt.parameters.required).toContain('evmAddress');
  });
});

describe('register(api) pattern', () => {
  it('plugin has id, name, register function', () => {
    expect(mandatePlugin.id).toBe('mandate-openclaw-plugin');
    expect(mandatePlugin.name).toBe('Mandate');
    expect(typeof mandatePlugin.register).toBe('function');
  });

  it('register(api) registers 3 tools: register, validate, status', () => {
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);
    expect(api.registerTool).toHaveBeenCalledTimes(3);
    const names = api.registerTool.mock.calls.map((c: any[]) => c[0].name);
    expect(names).toContain('mandate_register');
    expect(names).toContain('mandate_validate');
    expect(names).toContain('mandate_status');
  });

  it('configSchema has optional runtimeKey', () => {
    expect(mandatePlugin.configSchema).toBeDefined();
    expect((mandatePlugin.configSchema as any).properties).toHaveProperty('runtimeKey');
  });

  it('register(api) registers message:preprocessed hook', async () => {
    const { setRuntimeKey } = await import('../keyStore.js');
    setRuntimeKey('mndt_test_x');
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);
    const hookCalls = api.on.mock.calls.filter((c: any[]) => c[0] === 'message:preprocessed');
    expect(hookCalls).toHaveLength(1);
    expect(hookCalls[0][2]).toEqual({ priority: 100 });
  });

  it('hook skips mandate_* tools (no recursion)', async () => {
    const { setRuntimeKey } = await import('../keyStore.js');
    setRuntimeKey('mndt_test_x');
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);
    const hookHandler = api.on.mock.calls.find((c: any[]) => c[0] === 'message:preprocessed')![1];
    const pushMessage = vi.fn();
    await hookHandler({ type: 'message', action: 'preprocessed', toolName: 'mandate_validate', pushMessage });
    expect(pushMessage).not.toHaveBeenCalled();
  });

  it('hook blocks financial tools when fetch returns 422', async () => {
    const { setRuntimeKey } = await import('../keyStore.js');
    setRuntimeKey('mndt_test_x');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 422,
      json: () => Promise.resolve({ blockReason: 'daily_quota_exceeded', declineMessage: 'Daily limit' }),
    }));
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);
    const hookHandler = api.on.mock.calls.find((c: any[]) => c[0] === 'message:preprocessed')![1];
    const pushMessage = vi.fn();
    await hookHandler({ type: 'message', action: 'preprocessed', toolName: 'locus_transfer', toolInput: { to: '0xabc' }, pushMessage });
    expect(pushMessage).toHaveBeenCalledWith(expect.stringContaining('blocked'));
  });

  it('registered validate tool returns allowed or blocked', async () => {
    const { setRuntimeKey } = await import('../keyStore.js');
    setRuntimeKey('mndt_test_x');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ allowed: true, intentId: 'id1', action: 'transfer' }),
    }));
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);
    const validateCall = api.registerTool.mock.calls.find((c: any[]) => c[0].name === 'mandate_validate');
    expect(validateCall).toBeDefined();
    const result = await validateCall![0].execute('id1', { action: 'transfer', reason: 'test' });
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('instruction');
  });
});
