import { MandateClient, PolicyBlockedError, CircuitBreakerError } from '@mandate.md/sdk';

const FINANCIAL_TOOLS = /^(.*transfer.*|.*payment.*|.*swap.*|.*send.*|.*trade.*|.*buy.*|.*sell.*|.*order.*)$/i;
const FINANCIAL_KEYWORDS = /\b(transfer|pay|send|swap|trade|buy|sell|order|bridge|stake|unstake|withdraw|deposit|0x[0-9a-fA-F]{40})\b/i;

export function shouldIntercept(toolName: string, toolInput: unknown): boolean {
  if (FINANCIAL_TOOLS.test(toolName)) return true;
  const inputStr = JSON.stringify(toolInput ?? '');
  return FINANCIAL_KEYWORDS.test(inputStr);
}

export function buildReason(toolInput: unknown, conversationContext?: string): string {
  const toolText = typeof toolInput === 'string'
    ? toolInput
    : (toolInput as any)?.prompt ?? (toolInput as any)?.command ?? JSON.stringify(toolInput);
  const parts: string[] = [];
  if (conversationContext) parts.push(`User: ${conversationContext}`);
  parts.push(`Tool: ${toolText}`);
  return parts.join(' | ').slice(0, 1000);
}

export async function preflightValidate(
  runtimeKey: string,
  toolName: string,
  toolInput: unknown,
  conversationContext?: string,
): Promise<{ allowed: boolean; reason?: string; declineMessage?: string }> {
  if (!shouldIntercept(toolName, toolInput)) return { allowed: true };
  if (!runtimeKey) {
    return { allowed: false, reason: 'no_runtime_key', declineMessage: 'No runtimeKey configured. Call mandate_register first.' };
  }

  const client = new MandateClient({ runtimeKey });
  const reason = buildReason(toolInput, conversationContext);

  // Extract action from tool name (e.g. "bankr_swap" -> "swap", "locus_transfer" -> "transfer")
  const action = toolName.replace(/^.*?_/, '') || toolName;

  try {
    await client.preflight({
      action,
      reason,
      to: (toolInput as any)?.to ?? (toolInput as any)?.address,
      amount: (toolInput as any)?.amount,
      token: (toolInput as any)?.token ?? (toolInput as any)?.currency,
    });
    return { allowed: true };
  } catch (err) {
    if (err instanceof PolicyBlockedError) {
      return { allowed: false, reason: err.blockReason, declineMessage: err.declineMessage };
    }
    if (err instanceof CircuitBreakerError) {
      return { allowed: false, reason: 'circuit_breaker_active', declineMessage: 'Agent circuit breaker is active' };
    }
    return { allowed: false, reason: 'mandate_unreachable', declineMessage: 'Mandate policy server unreachable. Transaction halted for safety.' };
  }
}
