import { describe, it, expect, vi } from 'vitest';

vi.mock('@mandate/sdk', () => {
  const PolicyBlockedError = class extends Error {
    blockReason: string;
    constructor(r: string) { super(r); this.blockReason = r; }
  };
  const MandateWallet = vi.fn().mockImplementation(() => ({
    transfer: vi.fn().mockResolvedValue({ txHash: '0xabc', intentId: 'id1', status: { status: 'confirmed' } }),
    x402Pay: vi.fn().mockResolvedValue({ status: 200, ok: true }),
  }));
  return { MandateWallet, PolicyBlockedError, ApprovalRequiredError: class extends Error {
    intentId = 'id2'; approvalId = 'appr1';
  }};
});

import mandatePlugin, { transferTool, x402Tool } from '../plugin.js';

describe('openclaw plugin', () => {
  it('exports plugin with correct name and version', () => {
    expect(mandatePlugin.name).toBe('mandate');
    expect(mandatePlugin.version).toBe('0.1.0');
    expect(mandatePlugin.tools).toHaveLength(2);
  });

  it('transfer tool has correct JSON schema', () => {
    expect(transferTool.parameters.required).toContain('to');
    expect(transferTool.parameters.required).toContain('amount');
    expect(transferTool.parameters.required).toContain('tokenAddress');
  });

  it('transfer tool executes successfully', async () => {
    const result = await transferTool.execute({
      to: '0xRecipient',
      amount: '1000000',
      tokenAddress: '0xToken',
      runtimeKey: 'mndt_test',
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });
    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xabc');
  });

  it('transfer tool returns blocked=true on policy violation', async () => {
    const { MandateWallet, PolicyBlockedError } = await import('@mandate/sdk') as {
      MandateWallet: ReturnType<typeof vi.fn>;
      PolicyBlockedError: new (r: string) => Error & { blockReason: string };
    };
    const blockedTransfer = vi.fn().mockRejectedValueOnce(new PolicyBlockedError('per_tx_limit_exceeded'));
    (MandateWallet as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      transfer: blockedTransfer,
      x402Pay: vi.fn(),
    }));

    const result = await transferTool.execute({
      to: '0xRecipient',
      amount: '100000000',
      tokenAddress: '0xToken',
      runtimeKey: 'mndt_test',
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });
    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
  });
});
