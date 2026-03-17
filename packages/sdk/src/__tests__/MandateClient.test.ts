import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MandateClient } from '../MandateClient.js';
import {
  MandateError,
  CircuitBreakerError,
  PolicyBlockedError,
  ApprovalRequiredError,
  RiskBlockedError,
} from '../types.js';
import type { IntentPayload } from '../types.js';

const BASE_URL = 'http://localhost:8000';
const RUNTIME_KEY = 'mndt_test_abc123';

const PAYLOAD: IntentPayload = {
  chainId: 84532,
  nonce: 0,
  to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  calldata: '0xa9059cbb' as `0x${string}`,
  valueWei: '0',
  gasLimit: '100000',
  maxFeePerGas: '1000000000',
  maxPriorityFeePerGas: '1000000000',
  txType: 2,
  accessList: [],
  intentHash: '0x' + 'ab'.repeat(32) as `0x${string}`,
  reason: 'Invoice #127 from Alice for March design work',
};

function makeClient(): MandateClient {
  return new MandateClient({ runtimeKey: RUNTIME_KEY, baseUrl: BASE_URL });
}

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }));
}

beforeEach(() => { vi.unstubAllGlobals(); });

// ── MandateClient.register ────────────────────────────────────────────────────
describe('MandateClient.register', () => {
  it('returns RegisterResult on 201', async () => {
    const body = { agentId: 'uuid-1', runtimeKey: 'mndt_test_xyz', claimUrl: 'http://x', evmAddress: '0xabc', chainId: 84532 };
    mockFetch(201, body);

    const result = await MandateClient.register({
      name: 'TestAgent',
      evmAddress: '0xabc' as `0x${string}`,
      chainId: 84532,
      baseUrl: BASE_URL,
    });

    expect(result.agentId).toBe('uuid-1');
    expect(result.runtimeKey).toBe('mndt_test_xyz');
  });

  it('throws MandateError on non-ok response', async () => {
    mockFetch(422, { message: 'Invalid address' });

    await expect(MandateClient.register({
      name: 'Bad',
      evmAddress: '0x' as `0x${string}`,
      chainId: 84532,
      baseUrl: BASE_URL,
    })).rejects.toThrow(MandateError);
  });
});

// ── validate ─────────────────────────────────────────────────────────────────
describe('MandateClient#validate', () => {
  it('returns ValidateResult when allowed', async () => {
    mockFetch(200, { allowed: true, intentId: 'intent-1', requiresApproval: false, approvalId: null, blockReason: null });

    const result = await makeClient().validate(PAYLOAD);

    expect(result.allowed).toBe(true);
    expect(result.intentId).toBe('intent-1');
  });

  it('throws CircuitBreakerError on 403', async () => {
    mockFetch(403, {});

    await expect(makeClient().validate(PAYLOAD)).rejects.toThrow(CircuitBreakerError);
  });

  it('throws PolicyBlockedError on 422 with blockReason', async () => {
    mockFetch(422, { blockReason: 'per_tx_limit_exceeded' });

    const err = await makeClient().validate(PAYLOAD).catch(e => e);
    expect(err).toBeInstanceOf(PolicyBlockedError);
    expect(err.blockReason).toBe('per_tx_limit_exceeded');
  });

  it('passes declineMessage to PolicyBlockedError on 422', async () => {
    mockFetch(422, {
      blockReason: 'per_tx_limit_exceeded',
      blockDetail: '$10.00 exceeds $1/tx limit',
      declineMessage: 'This transaction exceeds the per-transaction spending limit.',
    });

    const err = await makeClient().validate(PAYLOAD).catch(e => e);
    expect(err).toBeInstanceOf(PolicyBlockedError);
    expect(err.declineMessage).toBe('This transaction exceeds the per-transaction spending limit.');
    expect(err.detail).toBe('$10.00 exceeds $1/tx limit');
  });

  it('throws RiskBlockedError on 422 with aegis_ blockReason', async () => {
    mockFetch(422, { blockReason: 'aegis_critical_risk' });

    const err = await makeClient().validate(PAYLOAD).catch(e => e);
    expect(err).toBeInstanceOf(RiskBlockedError);
    expect(err.blockReason).toBe('aegis_critical_risk');
  });

  it('includes riskLevel in ValidateResult', async () => {
    mockFetch(200, {
      allowed: true, intentId: 'i-1', requiresApproval: false,
      approvalId: null, blockReason: null, riskLevel: 'LOW', riskDegraded: false,
    });

    const result = await makeClient().validate(PAYLOAD);
    expect(result.riskLevel).toBe('LOW');
    expect(result.riskDegraded).toBe(false);
  });

  it('throws ApprovalRequiredError when requiresApproval=true', async () => {
    mockFetch(200, {
      allowed: true,
      intentId: 'intent-1',
      requiresApproval: true,
      approvalId: 'approval-1',
      blockReason: null,
    });

    const err = await makeClient().validate(PAYLOAD).catch(e => e);
    expect(err).toBeInstanceOf(ApprovalRequiredError);
    expect(err.intentId).toBe('intent-1');
    expect(err.approvalId).toBe('approval-1');
  });

  it('throws MandateError on 500', async () => {
    mockFetch(500, { error: 'Server error' });

    await expect(makeClient().validate(PAYLOAD)).rejects.toThrow(MandateError);
  });

  it('sends reason in validate request body', async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ allowed: true, intentId: 'i', requiresApproval: false, approvalId: null, blockReason: null }),
    });
    vi.stubGlobal('fetch', spy);

    await makeClient().validate(PAYLOAD);

    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.reason).toBe('Invoice #127 from Alice for March design work');
  });

  it('sends Authorization header', async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ allowed: true, intentId: 'i', requiresApproval: false, approvalId: null, blockReason: null }),
    });
    vi.stubGlobal('fetch', spy);

    await makeClient().validate(PAYLOAD);

    expect(spy).toHaveBeenCalledWith(
      `${BASE_URL}/api/validate`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${RUNTIME_KEY}` }),
      }),
    );
  });
});

// ── postEvent ─────────────────────────────────────────────────────────────────
describe('MandateClient#postEvent', () => {
  it('resolves void on 200', async () => {
    mockFetch(200, { status: 'broadcasted' });

    await expect(makeClient().postEvent('intent-1', '0xdeadbeef' as `0x${string}`)).resolves.toBeUndefined();
  });

  it('throws MandateError on error response', async () => {
    mockFetch(409, { error: 'Intent not in reserved state' });

    await expect(makeClient().postEvent('intent-1', '0xdeadbeef' as `0x${string}`)).rejects.toThrow(MandateError);
  });
});

// ── getStatus ─────────────────────────────────────────────────────────────────
describe('MandateClient#getStatus', () => {
  it('returns IntentStatus', async () => {
    const body = {
      intentId: 'intent-1',
      status: 'confirmed',
      txHash: '0xabc',
      blockNumber: '100',
      gasUsed: '50000',
      amountUsd: '10.00',
      decodedAction: 'transfer',
      blockReason: null,
      requiresApproval: false,
      approvalId: null,
      expiresAt: null,
    };
    mockFetch(200, body);

    const result = await makeClient().getStatus('intent-1');
    expect(result.status).toBe('confirmed');
    expect(result.txHash).toBe('0xabc');
  });

  it('throws MandateError on 404', async () => {
    mockFetch(404, { error: 'Not found' });

    await expect(makeClient().getStatus('no-such-id')).rejects.toThrow(MandateError);
  });
});

// ── waitForConfirmation ───────────────────────────────────────────────────────
describe('MandateClient#waitForConfirmation', () => {
  it('resolves immediately when already confirmed', async () => {
    mockFetch(200, {
      intentId: 'i', status: 'confirmed', txHash: '0x1',
      blockNumber: null, gasUsed: null, amountUsd: null, decodedAction: null,
      blockReason: null, requiresApproval: false, approvalId: null, expiresAt: null,
    });

    const result = await makeClient().waitForConfirmation('i', { intervalMs: 10 });
    expect(result.status).toBe('confirmed');
  });

  it('throws MandateError when status is failed', async () => {
    mockFetch(200, {
      intentId: 'i', status: 'failed', txHash: null,
      blockNumber: null, gasUsed: null, amountUsd: null, decodedAction: null,
      blockReason: 'reverted', requiresApproval: false, approvalId: null, expiresAt: null,
    });

    await expect(makeClient().waitForConfirmation('i', { intervalMs: 10 }))
      .rejects.toThrow(MandateError);
  });

  it('throws MandateError when status is expired', async () => {
    mockFetch(200, {
      intentId: 'i', status: 'expired', txHash: null,
      blockNumber: null, gasUsed: null, amountUsd: null, decodedAction: null,
      blockReason: null, requiresApproval: false, approvalId: null, expiresAt: null,
    });

    await expect(makeClient().waitForConfirmation('i', { intervalMs: 10 }))
      .rejects.toThrow(MandateError);
  });

  it('throws timeout error when deadline exceeded', async () => {
    // Always returns 'reserved' — never terminal
    mockFetch(200, {
      intentId: 'i', status: 'reserved', txHash: null,
      blockNumber: null, gasUsed: null, amountUsd: null, decodedAction: null,
      blockReason: null, requiresApproval: false, approvalId: null, expiresAt: null,
    });

    await expect(
      makeClient().waitForConfirmation('i', { timeoutMs: 50, intervalMs: 10 }),
    ).rejects.toThrow('Timeout');
  });
});

// ── Error classes ─────────────────────────────────────────────────────────────
describe('Error classes', () => {
  it('MandateError has statusCode', () => {
    const e = new MandateError('fail', 500);
    expect(e.statusCode).toBe(500);
    expect(e.name).toBe('MandateError');
  });

  it('CircuitBreakerError has statusCode=403', () => {
    const e = new CircuitBreakerError();
    expect(e.statusCode).toBe(403);
    expect(e.blockReason).toBe('circuit_breaker_active');
  });

  it('PolicyBlockedError captures reason', () => {
    const e = new PolicyBlockedError('daily_limit_exceeded');
    expect(e.statusCode).toBe(422);
    expect(e.blockReason).toBe('daily_limit_exceeded');
  });

  it('ApprovalRequiredError captures intentId + approvalId', () => {
    const e = new ApprovalRequiredError('i-1', 'a-1');
    expect(e.intentId).toBe('i-1');
    expect(e.approvalId).toBe('a-1');
    expect(e.statusCode).toBe(202);
  });
});
