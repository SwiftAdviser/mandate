import { describe, it, expect, vi } from 'vitest';

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

describe('openclaw plugin', () => {
  it('exports plugin with correct name and version', () => {
    expect(mandatePlugin.name).toBe('Mandate');
    expect(mandatePlugin.version).toBe('0.3.2');
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
  it('plugin has id, name, version, register function', () => {
    expect(mandatePlugin.id).toBe('openclaw-plugin');
    expect(mandatePlugin.name).toBe('Mandate');
    expect(mandatePlugin.version).toBe('0.3.2');
    expect(typeof mandatePlugin.register).toBe('function');
  });

  it('register(api) registers 3 tools: register, validate, status', () => {
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api, { runtimeKey: 'mndt_test_x' });
    expect(api.registerTool).toHaveBeenCalledTimes(3);
    const names = api.registerTool.mock.calls.map((c: any[]) => c[0].name);
    expect(names).toContain('mandate_register');
    expect(names).toContain('mandate_validate');
    expect(names).toContain('mandate_status');
  });

  it('configSchema has optional runtimeKey (no privateKey)', () => {
    expect(mandatePlugin.configSchema).toBeDefined();
    const schema = mandatePlugin.configSchema as any;
    expect(schema.required).toBeUndefined();
    expect(schema.properties).toHaveProperty('runtimeKey');
    expect(schema.properties).not.toHaveProperty('privateKey');
  });

  it('register(api) also registers message:preprocessed hook', () => {
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api, { runtimeKey: 'mndt_test_x' });
    expect(api.on).toHaveBeenCalledTimes(1);
    expect(api.on).toHaveBeenCalledWith('message:preprocessed', expect.any(Function), { priority: 100 });
  });

  it('hook skips mandate_* tools (no recursion)', async () => {
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api, { runtimeKey: 'mndt_test_x' });
    const hookHandler = api.on.mock.calls[0][1];
    const pushMessage = vi.fn();
    await hookHandler({ type: 'message', action: 'preprocessed', toolName: 'mandate_validate', pushMessage });
    expect(pushMessage).not.toHaveBeenCalled();
  });

  it('hook blocks financial tools when policy fails', async () => {
    const { MandateClient } = await import('@mandate.md/sdk') as any;
    const { PolicyBlockedError } = await import('@mandate.md/sdk') as any;
    MandateClient.mockImplementationOnce(() => ({
      validate: vi.fn().mockRejectedValueOnce(new PolicyBlockedError('daily_quota_exceeded', '', 'Daily limit reached')),
    }));
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api, { runtimeKey: 'mndt_test_x' });
    const hookHandler = api.on.mock.calls[0][1];
    const pushMessage = vi.fn();
    await hookHandler({ type: 'message', action: 'preprocessed', toolName: 'locus_transfer', toolInput: { to: '0xabc' }, pushMessage });
    expect(pushMessage).toHaveBeenCalledWith(expect.stringContaining('blocked'));
  });

  it('registered validate tool returns allowed or blocked', async () => {
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api, { runtimeKey: 'mndt_test_x' });
    const validateCall = api.registerTool.mock.calls.find((c: any[]) => c[0].name === 'mandate_validate');
    expect(validateCall).toBeDefined();
    const result = await validateCall![0].execute({ action: 'transfer 0.02 USDC to 0xAlice' });
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('instruction');
  });
});
