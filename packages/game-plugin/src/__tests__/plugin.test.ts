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

vi.mock('@virtuals-protocol/game', () => ({
  GameWorker: vi.fn().mockImplementation((opts: unknown) => opts),
  GameFunction: vi.fn().mockImplementation((opts: unknown) => opts),
}));

describe('mandateGameWorker', () => {
  it('creates a worker with transfer and x402 functions', async () => {
    const { createMandateWorker } = await import('../index.js');
    const config = {
      runtimeKey: 'mndt_test',
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      chainId: 84532,
    };
    const worker = createMandateWorker(config);
    expect(worker).toBeDefined();
  });

  it('transfer function returns done on success', async () => {
    const { createTransferFunction } = await import('../index.js');
    const config = {
      runtimeKey: 'mndt_test',
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      chainId: 84532,
    };
    const fn = createTransferFunction(config) as unknown as { executable: (args: Record<string, string>, logger: (msg: string) => void) => Promise<{ status: string }> };
    const result = await fn.executable({ to: '0xRecipient', amount: '1000000', token_address: '0xToken' }, () => {});
    expect(result.status).toBe('done');
  });
});
