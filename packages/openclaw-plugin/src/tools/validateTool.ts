import { MandateClient, PolicyBlockedError, CircuitBreakerError } from '@mandate.md/sdk';

export interface ValidateParams {
  action: string;
  amount?: string;
  to?: string;
  token?: string;
  reason?: string;
}

export const validateTool = {
  name: 'mandate_validate',
  description: 'MUST call before ANY financial action (transfer, swap, send, buy, sell, bridge, stake, bet). Checks spending limits, allowlists, schedules, and circuit breaker with Mandate policy engine. If allowed: proceed with your normal wallet (Locus, Bankr, etc.). If blocked: do NOT proceed, show the reason to the user. This tool does NOT execute transactions, it only checks policy and logs to audit trail.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'What you are about to do: transfer, swap, bridge, stake, buy, sell, bet, lend, etc. Be specific.' },
      amount: { type: 'string', description: 'Amount in human-readable units, e.g. "0.02"' },
      to: { type: 'string', description: 'Recipient address 0x...' },
      token: { type: 'string', description: 'Token symbol, e.g. "USDC", "ETH"' },
      reason: { type: 'string', description: 'Why this transaction is happening (for audit trail and prompt injection scan). Required.' },
    },
    required: ['action', 'reason'],
  },
  async execute(
    params: ValidateParams,
    context?: { runtimeKey?: string },
  ): Promise<{
    allowed: boolean;
    blocked?: boolean;
    intentId?: string;
    action?: string;
    reason?: string;
    declineMessage?: string;
    instruction?: string;
  }> {
    const runtimeKey = context?.runtimeKey ?? '';

    if (!runtimeKey) {
      return {
        allowed: false,
        blocked: true,
        reason: 'no_runtime_key',
        instruction: 'No runtimeKey configured. Call mandate_register first to get one, then set it in plugin config.',
      };
    }

    const client = new MandateClient({ runtimeKey });

    try {
      const result = await client.preflight({
        action: params.action,
        amount: params.amount,
        to: params.to,
        token: params.token,
        reason: params.reason ?? params.action,
      });

      return {
        allowed: true,
        intentId: result.intentId ?? undefined,
        action: params.action,
        instruction: `Policy check passed. Now proceed with your normal wallet (Locus, Bankr, etc.) to execute: ${params.action}`,
      };
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        return {
          allowed: false,
          blocked: true,
          reason: err.blockReason,
          declineMessage: err.declineMessage,
          instruction: `BLOCKED by Mandate policy. Do NOT execute this transaction. Reason: ${err.blockReason}. ${err.declineMessage ?? ''} User can adjust limits at app.mandate.md.`,
        };
      }
      if (err instanceof CircuitBreakerError) {
        return {
          allowed: false,
          blocked: true,
          reason: 'circuit_breaker_active',
          instruction: 'Agent circuit breaker is active. All transactions blocked. Owner must reset via dashboard.',
        };
      }
      return {
        allowed: false,
        blocked: true,
        reason: 'mandate_unreachable',
        instruction: 'Mandate policy server unreachable. Transaction halted for safety. Do NOT proceed.',
      };
    }
  },
};
