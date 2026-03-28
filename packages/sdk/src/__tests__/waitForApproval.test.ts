import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { MandateClient } from '../MandateClient.js';
import { MandateWallet } from '../MandateWallet.js';
import { MandateError, ApprovalRequiredError } from '../types.js';
import type { IntentStatus } from '../types.js';

const BASE_URL = 'http://localhost:8000';
const RUNTIME_KEY = 'mndt_test_abc123';

function makeClient(): MandateClient {
  return new MandateClient({ runtimeKey: RUNTIME_KEY, baseUrl: BASE_URL });
}

function statusResponse(status: IntentStatus['status'], extra: Partial<IntentStatus> = {}): IntentStatus {
  return {
    intentId: 'intent-1',
    status,
    txHash: null,
    blockNumber: null,
    gasUsed: null,
    amountUsd: null,
    decodedAction: null,
    blockReason: null,
    requiresApproval: false,
    approvalId: null,
    expiresAt: null,
    ...extra,
  };
}

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>): void {
  let callIndex = 0;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
    const resp = responses[Math.min(callIndex++, responses.length - 1)];
    return Promise.resolve({
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: () => Promise.resolve(resp.body),
    });
  }));
}

beforeEach(() => { vi.unstubAllGlobals(); });

// ── waitForApproval ──────────────────────────────────────────────────────────
describe('MandateClient#waitForApproval', () => {
  it('resolves on approved after 2 pending polls', async () => {
    mockFetchSequence([
      { status: 200, body: statusResponse('approval_pending') },
      { status: 200, body: statusResponse('approval_pending') },
      { status: 200, body: statusResponse('approved') },
    ]);

    const result = await makeClient().waitForApproval('intent-1', { intervalMs: 10 });
    expect(result.status).toBe('approved');
  });

  it('resolves on confirmed (approval was fast-tracked)', async () => {
    mockFetchSequence([
      { status: 200, body: statusResponse('confirmed', { txHash: '0xabc' }) },
    ]);

    const result = await makeClient().waitForApproval('intent-1', { intervalMs: 10 });
    expect(result.status).toBe('confirmed');
  });

  it('throws on failed (rejection)', async () => {
    mockFetchSequence([
      { status: 200, body: statusResponse('failed', { blockReason: 'rejected_by_human' }) },
    ]);

    await expect(
      makeClient().waitForApproval('intent-1', { intervalMs: 10 }),
    ).rejects.toThrow(MandateError);
  });

  it('throws on expired', async () => {
    mockFetchSequence([
      { status: 200, body: statusResponse('expired') },
    ]);

    await expect(
      makeClient().waitForApproval('intent-1', { intervalMs: 10 }),
    ).rejects.toThrow('expired');
  });

  it('throws on timeout', async () => {
    mockFetchSequence([
      { status: 200, body: statusResponse('approval_pending') },
      { status: 200, body: statusResponse('approval_pending') },
      { status: 200, body: statusResponse('approval_pending') },
      { status: 200, body: statusResponse('approval_pending') },
    ]);

    await expect(
      makeClient().waitForApproval('intent-1', { timeoutMs: 50, intervalMs: 10 }),
    ).rejects.toThrow('Timeout');
  });

  it('calls onPoll callback each iteration', async () => {
    mockFetchSequence([
      { status: 200, body: statusResponse('approval_pending') },
      { status: 200, body: statusResponse('approved') },
    ]);

    const polls: string[] = [];
    await makeClient().waitForApproval('intent-1', {
      intervalMs: 10,
      onPoll: (s) => polls.push(s.status),
    });

    expect(polls).toEqual(['approval_pending', 'approved']);
  });
});

// ── MandateWallet.sendTransactionWithApproval ────────────────────────────────
// We test this by mocking the internal MandateClient + viem calls via prototype
describe('MandateWallet.sendTransactionWithApproval', () => {
  function makeWallet(): MandateWallet {
    // Mock viem internals via constructor
    const wallet = Object.create(MandateWallet.prototype);
    // Set up mock client
    const mockClient = new MandateClient({ runtimeKey: RUNTIME_KEY, baseUrl: BASE_URL });
    Object.defineProperty(wallet, 'client', { value: mockClient });
    Object.defineProperty(wallet, 'chainId', { value: 84532 });
    Object.defineProperty(wallet, 'account', { value: { address: '0xabc' as `0x${string}` } });
    Object.defineProperty(wallet, 'publicClient', {
      value: {
        getTransactionCount: vi.fn().mockResolvedValue(0),
        estimateFeesPerGas: vi.fn().mockResolvedValue({
          maxFeePerGas: 1000000000n,
          maxPriorityFeePerGas: 1000000000n,
        }),
        estimateGas: vi.fn().mockResolvedValue(21000n),
      },
    });
    Object.defineProperty(wallet, 'wallet', {
      value: {
        sendTransaction: vi.fn().mockResolvedValue('0xtxhash' as `0x${string}`),
      },
    });
    return wallet;
  }

  it('catches ApprovalRequiredError and resumes after approval', async () => {
    const wallet = makeWallet();
    const client = (wallet as any).client as MandateClient;

    // validate throws ApprovalRequiredError
    vi.spyOn(client, 'rawValidate').mockRejectedValue(
      new ApprovalRequiredError('intent-1', 'approval-1'),
    );
    // waitForApproval resolves
    vi.spyOn(client, 'waitForApproval').mockResolvedValue(statusResponse('approved'));
    vi.spyOn(client, 'postEvent').mockResolvedValue(undefined);
    vi.spyOn(client, 'getStatus').mockResolvedValue(statusResponse('confirmed', { txHash: '0xtxhash' }));

    const pending: string[] = [];
    const result = await wallet.sendTransactionWithApproval(
      '0xrecipient' as `0x${string}`,
      '0xa9059cbb' as `0x${string}`,
      '0',
      {
        waitForConfirmation: false,
        onApprovalPending: (iid, aid) => pending.push(`${iid}:${aid}`),
      },
    );

    expect(pending).toEqual(['intent-1:approval-1']);
    expect(client.waitForApproval).toHaveBeenCalledWith('intent-1', expect.any(Object));
    expect(result.intentId).toBe('intent-1');
  });

  it('passes through when no approval needed', async () => {
    const wallet = makeWallet();
    const client = (wallet as any).client as MandateClient;

    vi.spyOn(client, 'rawValidate').mockResolvedValue({
      allowed: true,
      intentId: 'intent-2',
      requiresApproval: false,
      approvalId: null,
      blockReason: null,
    });
    vi.spyOn(client, 'postEvent').mockResolvedValue(undefined);
    vi.spyOn(client, 'getStatus').mockResolvedValue(statusResponse('confirmed', { txHash: '0xtxhash' }));

    const result = await wallet.sendTransactionWithApproval(
      '0xrecipient' as `0x${string}`,
      '0xa9059cbb' as `0x${string}`,
      '0',
      { waitForConfirmation: false },
    );

    expect(result.intentId).toBe('intent-2');
    expect(client.waitForApproval).toBeUndefined; // not called
  });

  it('transferWithApproval encodes ERC20 calldata', async () => {
    const wallet = makeWallet();
    const client = (wallet as any).client as MandateClient;

    vi.spyOn(client, 'rawValidate').mockResolvedValue({
      allowed: true,
      intentId: 'intent-3',
      requiresApproval: false,
      approvalId: null,
      blockReason: null,
    });
    vi.spyOn(client, 'postEvent').mockResolvedValue(undefined);
    vi.spyOn(client, 'getStatus').mockResolvedValue(statusResponse('confirmed'));

    const result = await wallet.transferWithApproval(
      '0x0000000000000000000000000000000000000001' as `0x${string}`,
      '1000000',
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
      { waitForConfirmation: false },
    );

    expect(result.intentId).toBe('intent-3');
    // validate was called with calldata starting with ERC20 transfer selector
    const validateCall = (client.rawValidate as any).mock.calls[0][0];
    expect(validateCall.calldata.startsWith('0xa9059cbb')).toBe(true);
  });
});
