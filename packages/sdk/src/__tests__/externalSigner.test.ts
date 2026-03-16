import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MandateWallet } from '../MandateWallet.js';
import type { ExternalSigner } from '../types.js';

// Mock viem to avoid real RPC calls
vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getTransactionCount: vi.fn().mockResolvedValue(5),
      estimateFeesPerGas: vi.fn().mockResolvedValue({
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n,
      }),
      estimateGas: vi.fn().mockResolvedValue(21000n),
    })),
    createWalletClient: vi.fn(() => ({
      sendTransaction: vi.fn().mockResolvedValue('0x' + 'aa'.repeat(32)),
    })),
  };
});

// Mock MandateClient
vi.mock('../MandateClient.js', () => ({
  MandateClient: vi.fn().mockImplementation(() => ({
    validate: vi.fn().mockResolvedValue({
      allowed: true,
      intentId: 'intent-123',
      requiresApproval: false,
      approvalId: null,
      blockReason: null,
    }),
    postEvent: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      intentId: 'intent-123',
      status: 'confirmed',
      txHash: '0x' + 'bb'.repeat(32),
      blockNumber: '100',
      gasUsed: '21000',
      amountUsd: '5.00',
      decodedAction: 'transfer',
      blockReason: null,
      requiresApproval: false,
      approvalId: null,
      expiresAt: null,
    }),
    waitForConfirmation: vi.fn().mockResolvedValue({
      intentId: 'intent-123',
      status: 'confirmed',
      txHash: '0x' + 'bb'.repeat(32),
      blockNumber: '100',
      gasUsed: '21000',
      amountUsd: '5.00',
      decodedAction: 'transfer',
      blockReason: null,
      requiresApproval: false,
      approvalId: null,
      expiresAt: null,
    }),
  })),
}));

const SIGNER_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`;
const TX_HASH = ('0x' + 'cc'.repeat(32)) as `0x${string}`;
const RECIPIENT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
const TOKEN = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;

function makeSigner(): ExternalSigner {
  return {
    sendTransaction: vi.fn().mockResolvedValue(TX_HASH),
    getAddress: vi.fn().mockReturnValue(SIGNER_ADDRESS),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MandateWallet with ExternalSigner', () => {
  it('throws if neither privateKey nor signer provided', () => {
    expect(() => new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
    })).toThrow();
  });

  it('accepts an external signer and resolves address', async () => {
    const signer = makeSigner();
    const wallet = new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
      signer,
    });

    const addr = await wallet.getAddress();
    expect(addr).toBe(SIGNER_ADDRESS);
    expect(signer.getAddress).toHaveBeenCalled();
  });

  it('calls signer.sendTransaction on transfer', async () => {
    const signer = makeSigner();
    const wallet = new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
      signer,
    });

    const result = await wallet.transfer(RECIPIENT, '5000000', TOKEN);

    expect(signer.sendTransaction).toHaveBeenCalledTimes(1);
    const call = (signer.sendTransaction as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.to).toBe(TOKEN);
    expect(call.value).toBe(0n);
    expect(typeof call.gas).toBe('bigint');
    expect(result.txHash).toBe(TX_HASH);
  });

  it('validates before signing with external signer', async () => {
    const signer = makeSigner();
    const wallet = new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
      signer,
    });

    const { MandateClient } = await import('../MandateClient.js');
    const mockClientInstance = (MandateClient as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;

    await wallet.transfer(RECIPIENT, '5000000', TOKEN);

    // validate should have been called before sendTransaction
    expect(mockClientInstance.validate).toHaveBeenCalledTimes(1);
    expect(signer.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('transfer result includes txHash from signer', async () => {
    const signer = makeSigner();
    const wallet = new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
      signer,
    });

    const result = await wallet.transfer(RECIPIENT, '5000000', TOKEN);
    expect(result.txHash).toBe(TX_HASH);
    expect(result.intentId).toBe('intent-123');
  });

  it('sync address getter works when getAddress() is sync', () => {
    const signer = makeSigner();
    const wallet = new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
      signer,
    });

    // Sync getAddress returns immediately, so address is eagerly cached
    expect(wallet.address).toBe(SIGNER_ADDRESS);
  });

  it('sync address getter throws when getAddress() is async and not yet resolved', () => {
    const asyncSigner: ExternalSigner = {
      sendTransaction: vi.fn().mockResolvedValue(TX_HASH),
      getAddress: vi.fn().mockResolvedValue(SIGNER_ADDRESS), // returns Promise
    };
    const wallet = new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
      signer: asyncSigner,
    });

    // Async getAddress not yet resolved, sync getter should throw
    expect(() => wallet.address).toThrow('Address not yet resolved');
  });

  it('sendEth works with external signer', async () => {
    const signer = makeSigner();
    const wallet = new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
      signer,
    });

    const result = await wallet.sendEth(RECIPIENT, '1000000000000000000');

    expect(signer.sendTransaction).toHaveBeenCalledTimes(1);
    const call = (signer.sendTransaction as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.to).toBe(RECIPIENT);
    expect(call.value).toBe(1000000000000000000n);
    expect(result.txHash).toBe(TX_HASH);
  });

  it('privateKey mode still works (backward compat)', async () => {
    // With privateKey, it should construct without error and use viem wallet
    const wallet = new MandateWallet({
      runtimeKey: 'mndt_test_abc',
      chainId: 84532,
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    });

    expect(wallet.address).toMatch(/^0x/);
    const addr = await wallet.getAddress();
    expect(addr).toBe(wallet.address);
  });
});
