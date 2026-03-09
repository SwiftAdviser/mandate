import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @coinbase/agentkit ────────────────────────────────────────────────
vi.mock('@coinbase/agentkit', () => {
  class WalletProvider {}
  class ActionProvider<_T = unknown> {
    constructor(_name: string, _actions: unknown[]) {}
  }
  const CreateAction =
    (_opts: unknown) =>
    (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor;

  return { WalletProvider, ActionProvider, CreateAction };
});

// ── Mock @mandate/sdk ──────────────────────────────────────────────────────
const mockTransfer = vi.fn();
const mockX402Pay = vi.fn();
const mockSendTransaction = vi.fn();

vi.mock('@mandate/sdk', () => {
  class MandateWallet {
    address = '0xAgentAddress';
    transfer = mockTransfer;
    x402Pay = mockX402Pay;
    sendTransaction = mockSendTransaction;
  }

  class MandateError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number,
      public readonly blockReason?: string,
    ) {
      super(message);
      this.name = 'MandateError';
    }
  }

  class PolicyBlockedError extends MandateError {
    constructor(reason: string) {
      super(`Transaction blocked by policy: ${reason}`, 422, reason);
      this.name = 'PolicyBlockedError';
    }
  }

  class ApprovalRequiredError extends MandateError {
    constructor(
      public readonly intentId: string,
      public readonly approvalId: string,
    ) {
      super('Transaction requires human approval.', 202, 'approval_required');
      this.name = 'ApprovalRequiredError';
    }
  }

  return { MandateWallet, MandateError, PolicyBlockedError, ApprovalRequiredError };
});

// ── Import after mocks ─────────────────────────────────────────────────────
import { MandateWalletProvider } from '../mandateWalletProvider.js';
import { MandateActionProvider } from '../mandateActionProvider.js';
import { PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';

// ── Helpers ────────────────────────────────────────────────────────────────
const makeConfig = () => ({
  runtimeKey: 'mndt_test_key',
  privateKey: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`,
  chainId: 84532,
});

const makeTransferArgs = () => ({
  to: '0xRecipient',
  amount: '1000000',
  tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  waitForConfirmation: true,
});

// ── MandateWalletProvider tests ───────────────────────────────────────────
describe('MandateWalletProvider', () => {
  let provider: MandateWalletProvider;

  beforeEach(() => {
    provider = new MandateWalletProvider(makeConfig());
  });

  it('getAddress returns wallet.address', () => {
    expect(provider.getAddress()).toBe('0xAgentAddress');
  });

  it('getNetwork returns correct chainId and networkId', () => {
    const network = provider.getNetwork();
    expect(network.chainId).toBe('84532');
    expect(network.networkId).toBe('eip155:84532');
    expect(network.protocolFamily).toBe('evm');
  });

  it('getName returns MandateWalletProvider', () => {
    expect(provider.getName()).toBe('MandateWalletProvider');
  });

  it('getMandateWallet returns the internal MandateWallet instance', () => {
    const wallet = provider.getMandateWallet();
    expect(wallet).toBeDefined();
    expect(wallet.address).toBe('0xAgentAddress');
  });

  it('signMessage throws not-implemented error', async () => {
    await expect(provider.signMessage('hello')).rejects.toThrow(
      'Direct message signing not implemented',
    );
  });

  it('sendTransaction delegates to wallet.sendTransaction', async () => {
    mockSendTransaction.mockResolvedValueOnce({
      txHash: '0xabc123',
      intentId: 'intent-1',
      status: { status: 'confirmed' },
    });

    const hash = await provider.sendTransaction({
      to: '0xRecipient',
      data: '0x',
      value: 0n,
    });

    expect(mockSendTransaction).toHaveBeenCalledWith('0xRecipient', '0x', '0');
    expect(hash).toBe('0xabc123');
  });
});

// ── MandateActionProvider tests ───────────────────────────────────────────
describe('MandateActionProvider', () => {
  let actionProvider: MandateActionProvider;
  let walletProvider: MandateWalletProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    actionProvider = new MandateActionProvider();
    walletProvider = new MandateWalletProvider(makeConfig());
  });

  describe('transfer action', () => {
    it('returns success message on allowed transfer', async () => {
      mockTransfer.mockResolvedValueOnce({
        txHash: '0xtxhash',
        intentId: 'intent-42',
        status: { status: 'confirmed' },
      });

      const result = await actionProvider.transfer(walletProvider, makeTransferArgs());

      expect(result).toContain('Transfer successful');
      expect(result).toContain('0xtxhash');
      expect(result).toContain('intent-42');
      expect(result).toContain('confirmed');
    });

    it('returns blocked message on PolicyBlockedError', async () => {
      mockTransfer.mockRejectedValueOnce(new PolicyBlockedError('daily_limit_exceeded'));

      const result = await actionProvider.transfer(walletProvider, makeTransferArgs());

      expect(result).toContain('Transfer blocked by Mandate policy');
      expect(result).toContain('daily_limit_exceeded');
    });

    it('returns approval-pending message on ApprovalRequiredError', async () => {
      mockTransfer.mockRejectedValueOnce(
        new ApprovalRequiredError('intent-99', 'approval-77'),
      );

      const result = await actionProvider.transfer(walletProvider, makeTransferArgs());

      expect(result).toContain('queued for approval');
      expect(result).toContain('intent-99');
      expect(result).toContain('approval-77');
    });

    it('re-throws unexpected errors', async () => {
      const boom = new Error('RPC timeout');
      mockTransfer.mockRejectedValueOnce(boom);

      await expect(actionProvider.transfer(walletProvider, makeTransferArgs())).rejects.toThrow(
        'RPC timeout',
      );
    });
  });

  describe('getPolicy action', () => {
    it('returns dashboard URL hint', async () => {
      const result = await actionProvider.getPolicy(walletProvider);
      expect(result).toContain('mandate.krutovoy.me');
    });
  });

  describe('getQuota action', () => {
    it('returns quota hint', async () => {
      const result = await actionProvider.getQuota(walletProvider);
      expect(result).toContain('Quota info');
    });
  });

  describe('supportsNetwork', () => {
    it('returns true for evm', () => {
      expect(actionProvider.supportsNetwork({ protocolFamily: 'evm' })).toBe(true);
    });

    it('returns false for non-evm', () => {
      expect(actionProvider.supportsNetwork({ protocolFamily: 'solana' })).toBe(false);
    });
  });
});
