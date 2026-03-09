import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist mocks so they're available inside vi.mock() factories ───────────────
const {
  mockValidate,
  mockMandateClient,
  PolicyBlockedError,
  ApprovalRequiredError,
  mockCreateJob,
  mockGetJobStatus,
  mockApprovePayment,
  mockPollUntil,
  mockSearch,
  mockGetMyInfo,
} = vi.hoisted(() => {
  const mockValidate = vi.fn();
  const mockMandateClient = vi.fn().mockImplementation(() => ({ validate: mockValidate }));

  class PolicyBlockedError extends Error {
    blockReason: string;
    constructor(r: string) { super(`Blocked: ${r}`); this.blockReason = r; }
  }
  class ApprovalRequiredError extends Error {
    intentId = 'intent-1';
    approvalId = 'appr-1';
  }

  const mockCreateJob      = vi.fn();
  const mockGetJobStatus   = vi.fn();
  const mockApprovePayment = vi.fn();
  const mockPollUntil      = vi.fn();
  const mockSearch         = vi.fn();
  const mockGetMyInfo      = vi.fn();

  return {
    mockValidate, mockMandateClient,
    PolicyBlockedError, ApprovalRequiredError,
    mockCreateJob, mockGetJobStatus, mockApprovePayment,
    mockPollUntil, mockSearch, mockGetMyInfo,
  };
});

// ── Mock @mandate/sdk ─────────────────────────────────────────────────────────
vi.mock('@mandate/sdk', () => ({
  MandateClient: mockMandateClient,
  PolicyBlockedError,
  ApprovalRequiredError,
}));

// ── Mock AcpClient ────────────────────────────────────────────────────────────
vi.mock('../acpClient.js', () => ({
  AcpClient: vi.fn().mockImplementation(() => ({
    createJob:             mockCreateJob,
    getJobStatus:          mockGetJobStatus,
    approvePayment:        mockApprovePayment,
    pollUntilPhaseChanges: mockPollUntil,
    search:                mockSearch,
    getMyInfo:             mockGetMyInfo,
  })),
}));

import { MandateAcpClient } from '../mandateAcpClient.js';

const CONFIG = {
  acpApiKey:         'acp_test_key',
  mandateRuntimeKey: 'mndt_test',
};

const NEGOTIATION_JOB = {
  jobId:                1,
  phase:                'NEGOTIATION' as const,
  providerWalletAddress: '0xProvider',
  clientWalletAddress:   '0xClient',
  providerName:          'Test Agent',
  clientName:            'My Agent',
  paymentRequestData: {
    budget:   { amount: 5, symbol: 'USDC', usdValue: 5 },
    transfer: { amount: 0, symbol: 'USDC', usdValue: 0 },
  },
  deliverable:  null,
  memoHistory:  [],
  expiry:       null,
};

describe('MandateAcpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockResolvedValue({ allowed: true, intentId: 'intent-1', requiresApproval: false, approvalId: null, blockReason: null });
    mockApprovePayment.mockResolvedValue(undefined);
  });

  // ── payJob ─────────────────────────────────────────────────────────────────

  describe('payJob', () => {
    it('validates and approves when policy allows', async () => {
      mockGetJobStatus.mockResolvedValue(NEGOTIATION_JOB);

      const client = new MandateAcpClient(CONFIG);
      const result = await client.payJob(1);

      expect(mockValidate).toHaveBeenCalledOnce();
      expect(mockApprovePayment).toHaveBeenCalledWith(1, true, undefined);
      expect(result).toEqual({ jobId: 1, accepted: true, blocked: false });
    });

    it('rejects and returns blocked=true when Mandate policy blocks', async () => {
      mockGetJobStatus.mockResolvedValue(NEGOTIATION_JOB);
      mockValidate.mockRejectedValue(new PolicyBlockedError('per_tx_limit_exceeded'));

      const client = new MandateAcpClient(CONFIG);
      const result = await client.payJob(1);

      expect(mockApprovePayment).toHaveBeenCalledWith(
        1, false, 'Rejected by Mandate policy: per_tx_limit_exceeded',
      );
      expect(result).toEqual({
        jobId:       1,
        accepted:    false,
        blocked:     true,
        blockReason: 'per_tx_limit_exceeded',
      });
    });

    it('returns requiresApproval=true when Mandate requires human approval', async () => {
      mockGetJobStatus.mockResolvedValue(NEGOTIATION_JOB);
      mockValidate.mockRejectedValue(new ApprovalRequiredError());

      const client = new MandateAcpClient(CONFIG);
      const result = await client.payJob(1);

      // Should NOT call approvePayment — waits for human
      expect(mockApprovePayment).not.toHaveBeenCalled();
      expect(result.requiresApproval).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('throws if job is not in NEGOTIATION phase', async () => {
      mockGetJobStatus.mockResolvedValue({ ...NEGOTIATION_JOB, phase: 'COMPLETED' });

      const client = new MandateAcpClient(CONFIG);
      await expect(client.payJob(1)).rejects.toThrow('not NEGOTIATION');
    });

    it('throws if paymentRequestData is missing', async () => {
      mockGetJobStatus.mockResolvedValue({ ...NEGOTIATION_JOB, paymentRequestData: null });

      const client = new MandateAcpClient(CONFIG);
      await expect(client.payJob(1)).rejects.toThrow('no paymentRequestData');
    });

    it('sums budget + transfer usdValue for validation', async () => {
      const jobWithTransfer = {
        ...NEGOTIATION_JOB,
        paymentRequestData: {
          budget:   { amount: 5,  symbol: 'USDC', usdValue: 5 },
          transfer: { amount: 10, symbol: 'USDC', usdValue: 10 },
        },
      };
      mockGetJobStatus.mockResolvedValue(jobWithTransfer);

      const client = new MandateAcpClient(CONFIG);
      await client.payJob(1);

      // validate called with ~15 USDC worth of calldata
      const call = mockValidate.mock.calls[0][0];
      // calldata encodes rawAmount: Math.ceil(15 * 1e6) = 15_000_000 = 0xE4E1C0
      expect(call.calldata).toContain('00e4e1c0'.toLowerCase());
    });
  });

  // ── createAndPay ───────────────────────────────────────────────────────────

  describe('createAndPay', () => {
    it('creates job, polls, validates, approves', async () => {
      mockCreateJob.mockResolvedValue({ jobId: 42 });
      mockPollUntil.mockResolvedValue(NEGOTIATION_JOB);
      mockGetJobStatus.mockResolvedValue(NEGOTIATION_JOB);

      const client = new MandateAcpClient(CONFIG);
      const result = await client.createAndPay('0xProvider', 'Execute Trade', { pair: 'ETH/USDC' });

      expect(mockCreateJob).toHaveBeenCalledWith('0xProvider', 'Execute Trade', { pair: 'ETH/USDC' }, false);
      expect(mockValidate).toHaveBeenCalledOnce();
      expect(mockApprovePayment).toHaveBeenCalledWith(42, true, undefined);
      expect(result.jobId).toBe(42);
      expect(result.accepted).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('returns blocked if policy blocks during createAndPay', async () => {
      mockCreateJob.mockResolvedValue({ jobId: 99 });
      mockPollUntil.mockResolvedValue(NEGOTIATION_JOB);
      mockGetJobStatus.mockResolvedValue(NEGOTIATION_JOB);
      mockValidate.mockRejectedValue(new PolicyBlockedError('per_day_limit_exceeded'));

      const client = new MandateAcpClient(CONFIG);
      const result = await client.createAndPay('0xProvider', 'Execute Trade');

      expect(result.blocked).toBe(true);
      expect(result.blockReason).toBe('per_day_limit_exceeded');
      expect(result.accepted).toBe(false);
    });

    it('returns non-negotiation phase without paying', async () => {
      mockCreateJob.mockResolvedValue({ jobId: 7 });
      mockPollUntil.mockResolvedValue({ ...NEGOTIATION_JOB, phase: 'REJECTED' });

      const client = new MandateAcpClient(CONFIG);
      const result = await client.createAndPay('0xProvider', 'Execute Trade');

      expect(mockValidate).not.toHaveBeenCalled();
      expect(result.accepted).toBe(false);
      expect(result.phase).toBe('REJECTED');
    });
  });

  // ── createJob (passthrough) ────────────────────────────────────────────────

  it('createJob passes isAutomated=false', async () => {
    mockCreateJob.mockResolvedValue({ jobId: 5 });

    const client = new MandateAcpClient(CONFIG);
    await client.createJob('0xProvider', 'My Offering', { key: 'val' });

    expect(mockCreateJob).toHaveBeenCalledWith('0xProvider', 'My Offering', { key: 'val' }, false);
  });
});
