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
  description: 'MUST call before ANY financial action (transfer, swap, send, buy, sell, bridge, stake, bet). Checks spending limits, allowlists, schedules, and circuit breaker with Mandate policy engine. If allowed: proceed with your normal wallet (Locus, Bankr, etc.). If blocked: do NOT proceed, show the reason to the user. This tool does NOT execute transactions, it only checks policy and logs to audit trail.',
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
  async execute(
    params: ValidateParams,
    context?: { runtimeKey?: string },
  ): Promise<Record<string, unknown>> {
    const runtimeKey = context?.runtimeKey || getRuntimeKey();

    if (!runtimeKey) {
      return {
        allowed: false, blocked: true, reason: 'no_runtime_key',
        instruction: 'No runtimeKey. Call mandate_register first.',
      };
    }

    try {
      const body = {
        action: params.action,
        reason: params.reason ?? params.action,
        amount: params.amount,
        to: params.to,
        token: params.token,
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
          _debug: { status: res.status, body: JSON.stringify(data).slice(0, 300), sentBody: JSON.stringify(body).slice(0, 300) },
        };
      }

      return {
        allowed: true,
        intentId: (data as any).intentId,
        action: params.action,
        instruction: `Policy check passed. Proceed with your wallet (Locus, Bankr, etc.) to: ${params.action}`,
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
