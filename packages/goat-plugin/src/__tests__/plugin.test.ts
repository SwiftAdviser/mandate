import { describe, it, expect, vi } from 'vitest';

vi.mock('@goat-sdk/core', () => {
  class PluginBase {
    constructor(protected _name: string, protected _tools: unknown[]) {}
    getTools(_wallet: unknown) { return []; }
    supportsChain(_chain: unknown): boolean { return false; }
  }
  class ToolBase {}
  // No-op decorator factory — returns the method descriptor unchanged
  const Tool = (_opts: unknown) => (_target: unknown, _key: string, desc: PropertyDescriptor) => desc;
  return { PluginBase, ToolBase, Tool };
});

import { mandate, MandatePlugin } from '../index.js';

vi.mock('@mandate/sdk', () => {
  const PolicyBlockedError = class extends Error {
    blockReason: string;
    constructor(r: string) { super(r); this.blockReason = r; }
  };
  const MandateWallet = vi.fn().mockImplementation(() => ({
    transfer: vi.fn().mockResolvedValue({ txHash: '0xabc', intentId: 'id1', status: { status: 'confirmed' } }),
    x402Pay: vi.fn().mockResolvedValue({ status: 200, ok: true }),
  }));
  return { MandateWallet, PolicyBlockedError, ApprovalRequiredError: class extends Error {} };
});

describe('MandatePlugin', () => {
  const config = {
    runtimeKey: 'mndt_test',
    privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
  };

  it('factory creates plugin instance', () => {
    const plugin = mandate(config);
    expect(plugin).toBeInstanceOf(MandatePlugin);
  });

  it('supports evm chains', () => {
    const plugin = mandate(config);
    expect(plugin.supportsChain({ type: 'evm' } as never)).toBe(true);
  });

  it('does not support solana', () => {
    const plugin = mandate(config);
    expect(plugin.supportsChain({ type: 'solana' } as never)).toBe(false);
  });
});
