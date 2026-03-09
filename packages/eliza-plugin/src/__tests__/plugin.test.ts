import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@mandate/sdk', () => {
  const PolicyBlockedError = class extends Error {
    blockReason: string;
    constructor(reason: string) {
      super(reason);
      this.blockReason = reason;
    }
  };

  const ApprovalRequiredError = class extends Error {
    intentId: string;
    approvalId: string;
    constructor(id: string, aid: string) {
      super('Approval required');
      this.intentId = id;
      this.approvalId = aid;
    }
  };

  const MandateWallet = vi.fn().mockImplementation(() => ({
    address: '0xMockAddress',
    transfer: vi.fn().mockResolvedValue({
      txHash: '0xabc',
      intentId: 'intent-1',
      status: { status: 'confirmed' },
    }),
    x402Pay: vi.fn(),
    sendEth: vi.fn(),
  }));

  return { MandateWallet, PolicyBlockedError, ApprovalRequiredError, MandateClient: vi.fn() };
});

import { transferAction } from '../actions/transfer.js';
import { walletStateProvider } from '../providers/wallet.js';
import { MandateWallet, PolicyBlockedError } from '@mandate/sdk';

const mockRuntime = {
  getSetting: (key: string) => {
    const settings: Record<string, string> = {
      MANDATE_RUNTIME_KEY: 'test-runtime-key',
      MANDATE_PRIVATE_KEY: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      MANDATE_CHAIN_ID: '84532',
    };
    return settings[key] ?? null;
  },
};

const mockMessage = { content: { text: '' }, userId: 'user-1', roomId: 'room-1' } as never;

describe('transferAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls callback with success message on allowed transfer', async () => {
    const callback = vi.fn();

    const result = await transferAction.handler(
      mockRuntime as never,
      mockMessage,
      undefined,
      {
        to: '0xRecipient' as `0x${string}`,
        amount: '1000000',
        tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
      },
      callback,
    );

    expect(result).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
    const callbackArg = callback.mock.calls[0][0];
    expect(callbackArg.text).toContain('Transfer successful');
    expect(callbackArg.text).toContain('0xabc');
    expect(callbackArg.text).toContain('intent-1');
    expect(callbackArg.content).toMatchObject({ txHash: '0xabc', intentId: 'intent-1' });
  });

  it('calls callback with blocked message when PolicyBlockedError is thrown', async () => {
    const mockWalletInstance = {
      address: '0xMockAddress',
      transfer: vi.fn().mockRejectedValue(new PolicyBlockedError('daily limit exceeded')),
      x402Pay: vi.fn(),
      sendEth: vi.fn(),
    };
    vi.mocked(MandateWallet).mockImplementationOnce(() => mockWalletInstance as never);

    const callback = vi.fn();

    const result = await transferAction.handler(
      mockRuntime as never,
      mockMessage,
      undefined,
      {
        to: '0xRecipient' as `0x${string}`,
        amount: '99999999',
        tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
      },
      callback,
    );

    expect(result).toBe(false);
    expect(callback).toHaveBeenCalledOnce();
    const callbackArg = callback.mock.calls[0][0];
    expect(callbackArg.text).toContain('blocked by Mandate policy');
    expect(callbackArg.text).toContain('daily limit exceeded');
    expect(callbackArg.content).toMatchObject({ blocked: true, reason: 'daily limit exceeded' });
  });

  it('validate returns true when MANDATE_RUNTIME_KEY is set', async () => {
    const valid = await transferAction.validate(mockRuntime as never, mockMessage);
    expect(valid).toBe(true);
  });

  it('validate returns false when MANDATE_RUNTIME_KEY is missing', async () => {
    const emptyRuntime = { getSetting: () => null };
    // Remove env var for this test
    const saved = process.env.MANDATE_RUNTIME_KEY;
    delete process.env.MANDATE_RUNTIME_KEY;

    const valid = await transferAction.validate(emptyRuntime as never, mockMessage);
    expect(valid).toBe(false);

    process.env.MANDATE_RUNTIME_KEY = saved;
  });
});

describe('walletStateProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns wallet address string when configured', async () => {
    const result = await walletStateProvider.get(mockRuntime as never, mockMessage, undefined);

    expect(typeof result).toBe('string');
    expect(result).toContain('0xMockAddress');
    expect(result).toContain('84532');
    expect(result).toContain('Policy enforcement: active');
  });

  it('returns not-configured message when runtimeKey is missing', async () => {
    const emptyRuntime = { getSetting: () => null };
    const saved = process.env.MANDATE_RUNTIME_KEY;
    const savedPk = process.env.MANDATE_PRIVATE_KEY;
    delete process.env.MANDATE_RUNTIME_KEY;
    delete process.env.MANDATE_PRIVATE_KEY;

    const result = await walletStateProvider.get(emptyRuntime as never, mockMessage, undefined);

    expect(result).toContain('not configured');

    process.env.MANDATE_RUNTIME_KEY = saved;
    process.env.MANDATE_PRIVATE_KEY = savedPk;
  });

  it('returns error message when MandateWallet constructor throws', async () => {
    vi.mocked(MandateWallet).mockImplementationOnce(() => {
      throw new Error('bad config');
    });

    const result = await walletStateProvider.get(mockRuntime as never, mockMessage, undefined);

    expect(result).toContain('error loading configuration');
  });
});
