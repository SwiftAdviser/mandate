import { getRuntimeKey } from '../keyStore.js';

export interface ValidateParams {
  action: string;
  amount?: string;
  to?: string;
  token?: string;
  reason?: string;
}

const MANDATE_BASE = 'https://app.mandate.md';

export const validateTool = {
  name: 'mandate_validate',
  description: 'MUST call before ANY financial action (transfer, swap, send, buy, sell, bridge, stake, bet). Checks spending limits, allowlists, schedules, and circuit breaker. If allowed: proceed with your wallet (Locus, Bankr). If blocked: do NOT proceed.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'What you are about to do: transfer, swap, bridge, stake, buy, sell, bet, lend, etc.' },
      amount: { type: 'string', description: 'Amount in human-readable units, e.g. "0.02"' },
      to: { type: 'string', description: 'Recipient address 0x...' },
      token: { type: 'string', description: 'Token symbol, e.g. "USDC", "ETH"' },
      reason: { type: 'string', description: 'Why this transaction is happening (audit trail + prompt injection scan).' },
    },
    required: ['action', 'reason'],
  },
  // OpenClaw signature: execute(_id, params) -- first arg is tool call ID
  async execute(_id: unknown, params?: ValidateParams | unknown): Promise<Record<string, unknown>> {
    // Handle both OpenClaw signature (id, params) and direct call (params)
    let p: ValidateParams;
    if (params && typeof params === 'object' && 'action' in params) {
      p = params as ValidateParams;
    } else if (_id && typeof _id === 'object' && 'action' in _id) {
      p = _id as ValidateParams;
    } else {
      return {
        allowed: false, blocked: true, reason: 'invalid_params',
        instruction: 'Missing required params: action, reason.',
      };
    }

    const runtimeKey = getRuntimeKey();

    if (!runtimeKey) {
      return {
        allowed: false, blocked: true, reason: 'no_runtime_key',
        instruction: 'No runtimeKey. Call mandate_register first.',
      };
    }

    try {
      const body = {
        action: p.action,
        reason: p.reason ?? p.action,
        amount: p.amount,
        to: p.to,
        token: p.token,
      };

      const res = await fetch(`${MANDATE_BASE}/api/validate/preflight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${runtimeKey}` },
        body: JSON.stringify(body),
      });

      if (res.status === 403) {
        return { allowed: false, blocked: true, reason: 'circuit_breaker_active', instruction: 'Circuit breaker active.' };
      }

      const data = await res.json().catch(() => ({}) as Record<string, unknown>);

      if (!res.ok || (data as any).allowed === false) {
        return {
          allowed: false, blocked: true,
          reason: (data as any).blockReason ?? 'policy_blocked',
          declineMessage: (data as any).declineMessage,
          instruction: `BLOCKED. ${(data as any).blockReason ?? ''}: ${(data as any).declineMessage ?? (data as any).message ?? ''}. Adjust at app.mandate.md.`,
        };
      }

      return {
        allowed: true,
        intentId: (data as any).intentId,
        action: p.action,
        instruction: `Policy check passed. Proceed with your wallet (Locus, Bankr, etc.) to: ${p.action}`,
      };
    } catch (err: unknown) {
      return {
        allowed: false, blocked: true, reason: 'mandate_unreachable',
        instruction: 'Mandate unreachable. Do NOT proceed.',
        _debug: { error: err instanceof Error ? err.message : String(err) },
      };
    }
  },
};
