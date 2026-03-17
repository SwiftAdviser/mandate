import { describe, it, expect, vi } from 'vitest';

vi.mock('@mandate/sdk', () => {
  const PolicyBlockedError = class extends Error {
    blockReason: string;
    declineMessage?: string;
    constructor(r: string, d?: string, dm?: string) { super(r); this.blockReason = r; this.declineMessage = dm; }
  };
  const ApprovalRequiredError = class extends Error {
    intentId = 'id2'; approvalId = 'appr1'; approvalReason = 'Amount above threshold.';
  };
  const MandateWallet = vi.fn().mockImplementation(() => ({
    transfer: vi.fn().mockResolvedValue({ txHash: '0xabc', intentId: 'id1', status: { status: 'confirmed' } }),
    x402Pay: vi.fn().mockResolvedValue({ status: 200, ok: true }),
    sendEth: vi.fn().mockResolvedValue({ txHash: '0xdef', intentId: 'id3', status: { status: 'confirmed' } }),
  }));
  return { MandateWallet, PolicyBlockedError, ApprovalRequiredError };
});

import mandatePlugin, { transferTool, x402Tool, sendEthTool } from '../plugin.js';

describe('openclaw plugin', () => {
  it('exports plugin with correct name and version', () => {
    expect(mandatePlugin.name).toBe('mandate');
    expect(mandatePlugin.version).toBe('0.2.0');
    expect(mandatePlugin.tools).toHaveLength(3);
  });

  it('transfer tool has correct JSON schema without privateKey', () => {
    expect(transferTool.parameters.required).toContain('to');
    expect(transferTool.parameters.required).toContain('amount');
    expect(transferTool.parameters.required).toContain('tokenAddress');
    expect(transferTool.parameters.properties).not.toHaveProperty('privateKey');
    expect(transferTool.parameters.properties).not.toHaveProperty('runtimeKey');
    expect(transferTool.parameters.properties).toHaveProperty('chainId');
  });

  it('transfer tool executes successfully via context', async () => {
    const result = await transferTool.execute(
      { to: '0xRecipient', amount: '1000000', tokenAddress: '0xToken' },
      { runtimeKey: 'mndt_test', privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    );
    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xabc');
  });

  it('transfer tool returns blocked=true with declineMessage on policy violation', async () => {
    const { MandateWallet, PolicyBlockedError } = await import('@mandate/sdk') as {
      MandateWallet: ReturnType<typeof vi.fn>;
      PolicyBlockedError: new (r: string, d?: string, dm?: string) => Error & { blockReason: string; declineMessage?: string };
    };
    const blockedTransfer = vi.fn().mockRejectedValueOnce(
      new PolicyBlockedError('per_tx_limit_exceeded', 'over limit', 'Split into smaller amounts'),
    );
    (MandateWallet as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      transfer: blockedTransfer,
      x402Pay: vi.fn(),
      sendEth: vi.fn(),
    }));

    const result = await transferTool.execute(
      { to: '0xRecipient', amount: '100000000', tokenAddress: '0xToken' },
      { runtimeKey: 'mndt_test', privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    );
    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.declineMessage).toBe('Split into smaller amounts');
  });

  it('x402 tool has chainId param but no privateKey', () => {
    expect(x402Tool.parameters.properties).not.toHaveProperty('privateKey');
    expect(x402Tool.parameters.properties).not.toHaveProperty('runtimeKey');
    expect(x402Tool.parameters.properties).toHaveProperty('chainId');
  });

  it('sendEth tool executes successfully', async () => {
    const result = await sendEthTool.execute(
      { to: '0xRecipient', valueWei: '1000000000000000000' },
      { runtimeKey: 'mndt_test', privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    );
    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xdef');
  });

  it('sendEth tool returns blocked=true on policy violation', async () => {
    const { MandateWallet, PolicyBlockedError } = await import('@mandate/sdk') as {
      MandateWallet: ReturnType<typeof vi.fn>;
      PolicyBlockedError: new (r: string, d?: string, dm?: string) => Error & { blockReason: string; declineMessage?: string };
    };
    const blockedSend = vi.fn().mockRejectedValueOnce(
      new PolicyBlockedError('value_wei_exceeded', 'too much', 'Native value exceeds policy maximum.'),
    );
    (MandateWallet as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      transfer: vi.fn(),
      x402Pay: vi.fn(),
      sendEth: blockedSend,
    }));

    const result = await sendEthTool.execute(
      { to: '0xRecipient', valueWei: '99999999999999999999' },
      { runtimeKey: 'mndt_test', privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    );
    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.declineMessage).toBe('Native value exceeds policy maximum.');
  });

  it('sendEth tool has correct JSON schema', () => {
    expect(sendEthTool.parameters.required).toContain('to');
    expect(sendEthTool.parameters.required).toContain('valueWei');
    expect(sendEthTool.parameters.properties).not.toHaveProperty('privateKey');
  });
});
