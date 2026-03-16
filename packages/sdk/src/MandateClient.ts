import type {
  IntentPayload, IntentStatus, MandateConfig,
  RegisterResult, ValidateResult,
} from './types.js';
import {
  ApprovalRequiredError, CircuitBreakerError,
  MandateError, PolicyBlockedError, RiskBlockedError,
} from './types.js';

const DEFAULT_BASE = 'https://api.mandate.krutovoy.me';

/**
 * Low-level Mandate API client.
 * Use MandateWallet for a higher-level signing+broadcast flow.
 */
export class MandateClient {
  private readonly baseUrl: string;
  private readonly runtimeKey: string;

  constructor(config: MandateConfig) {
    this.runtimeKey = config.runtimeKey;
    this.baseUrl    = (config.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
  }

  // ── Registration (no auth) ────────────────────────────────────────────
  static async register(params: {
    name: string;
    evmAddress: `0x${string}`;
    chainId: number;
    defaultPolicy?: { spendLimitPerTxUsd?: number; spendLimitPerDayUsd?: number };
    baseUrl?: string;
  }): Promise<RegisterResult> {
    const base = (params.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    const res  = await fetch(`${base}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new MandateError(err.message ?? 'Registration failed', res.status);
    }

    return res.json();
  }

  // ── Validation ────────────────────────────────────────────────────────
  async validate(payload: IntentPayload): Promise<ValidateResult> {
    const res = await this.post('/api/validate', payload);

    if (res.status === 403) throw new CircuitBreakerError();

    if (res.status === 422) {
      const data = await res.json();
      const reason = data.blockReason ?? 'unknown';
      if (reason.startsWith('aegis_')) {
        throw new RiskBlockedError(reason);
      }
      throw new PolicyBlockedError(reason, data.blockDetail);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new MandateError(data.error ?? 'Validation failed', res.status);
    }

    const data: ValidateResult = await res.json();

    if (data.requiresApproval && data.intentId && data.approvalId) {
      throw new ApprovalRequiredError(data.intentId, data.approvalId);
    }

    return data;
  }

  // ── Post event (after broadcast) ─────────────────────────────────────
  async postEvent(intentId: string, txHash: `0x${string}`): Promise<void> {
    const res = await this.post(`/api/intents/${intentId}/events`, { txHash });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new MandateError(data.error ?? 'Event post failed', res.status);
    }
  }

  // ── Status polling ────────────────────────────────────────────────────
  async getStatus(intentId: string): Promise<IntentStatus> {
    const res = await this.get(`/api/intents/${intentId}/status`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new MandateError(data.error ?? 'Status fetch failed', res.status);
    }
    return res.json();
  }

  /**
   * Poll intent status until approval decision (approved/confirmed/failed/expired).
   * Use after catching ApprovalRequiredError to wait for human decision.
   */
  async waitForApproval(
    intentId: string,
    opts: {
      timeoutMs?: number;
      intervalMs?: number;
      onPoll?: (status: IntentStatus) => void;
    } = {},
  ): Promise<IntentStatus> {
    const timeout  = opts.timeoutMs  ?? 3600_000; // 1h — matches server approval TTL
    const interval = opts.intervalMs ?? 5_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const status = await this.getStatus(intentId);
      opts.onPoll?.(status);

      if (status.status === 'approved' || status.status === 'confirmed') return status;
      if (status.status === 'failed')  throw new MandateError(`Intent failed: ${status.blockReason ?? 'rejected'}`, 422, status.blockReason ?? 'failed');
      if (status.status === 'expired') throw new MandateError('Approval expired', 408, 'expired');

      await sleep(interval);
    }

    throw new MandateError('Timeout waiting for approval', 408, 'timeout');
  }

  /**
   * Poll intent status until terminal (confirmed/failed/expired).
   * Throws if timeout exceeded or if status is failed.
   */
  async waitForConfirmation(
    intentId: string,
    opts: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<IntentStatus> {
    const timeout  = opts.timeoutMs  ?? 5 * 60 * 1000; // 5 min
    const interval = opts.intervalMs ?? 3_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const status = await this.getStatus(intentId);

      if (status.status === 'confirmed') return status;
      if (status.status === 'failed')    throw new MandateError(`Intent failed: ${status.blockReason ?? 'unknown'}`, 422, status.blockReason ?? 'failed');
      if (status.status === 'expired')   throw new MandateError('Intent expired before confirmation', 408, 'expired');

      await sleep(interval);
    }

    throw new MandateError('Timeout waiting for confirmation', 408, 'timeout');
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private async post(path: string, body: unknown): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.runtimeKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  private async get(path: string): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      headers: { 'Authorization': `Bearer ${this.runtimeKey}` },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
