const DOCS: Record<string, string> = {
  'endpoints': `
Mandate API Endpoints (base: https://app.mandate.md/api)

Auth: Bearer <MANDATE_RUNTIME_KEY> OR x402 pay-per-call (USDC on Base)

POST /api/agents/register     No auth. Register agent, get runtimeKey + claimUrl.
POST /api/activate            RuntimeKey. Set wallet address after registration.
POST /api/validate            RuntimeKey or x402 ($0.10). Chain-agnostic policy check.
POST /api/validate/preflight  RuntimeKey or x402 ($0.05). Alias for validate.
POST /api/validate/raw        RuntimeKey. Legacy EVM-only validation (deprecated).
POST /api/intents/{id}/events RuntimeKey. Post txHash after broadcast.
GET  /api/intents/{id}/status RuntimeKey. Poll intent state.
POST /api/risk/check          RuntimeKey. Address risk assessment.
  `.trim(),

  'validate': `
POST /api/validate (chain-agnostic policy check)
Auth: Bearer <MANDATE_RUNTIME_KEY> or x402 ($0.10 USDC on Base)

Request body:
  action: string (required) - e.g. "transfer", "swap", "approve"
  reason: string (required, max 1000 chars) - human-readable explanation
  amount?: string - token amount (e.g. "1.5")
  to?: string - recipient address (EVM 0x..., Solana base58, TON)
  token?: string - token symbol (e.g. "USDC", "ETH")
  chain?: string - chain identifier (e.g. "8453", "solana", "ton")

Response 200 (allowed):
  { allowed: true, intentId: string, action: string, chain: string, requiresApproval: false }

Response 422 (blocked):
  { allowed: false, blockReason: string, declineMessage: string, action: string }

Response 202 (approval required):
  { allowed: false, requiresApproval: true, intentId: string, approvalId: string, instruction: string }

Block reasons: per_tx_limit_exceeded, per_day_limit_exceeded, per_month_limit_exceeded,
  address_not_allowed, blocked_action, circuit_breaker_active, no_active_policy, outside_schedule
  `.trim(),

  'register': `
POST /api/agents/register (no auth required)
Creates a new agent and returns credentials.

Request body:
  name: string (required) - agent display name
  walletAddress?: string - EVM 0x..., Solana base58, or TON address
  chainId?: number | string - e.g. 84532, 8453, "solana", "ton"
  defaultPolicy?: {
    spendLimitPerTxUsd?: number
    spendLimitPerDayUsd?: number
    spendLimitPerMonthUsd?: number
  }

Response:
  { agentId, runtimeKey, claimUrl, walletAddress, chainId }

The runtimeKey (mndt_live_... or mndt_test_...) is used as Bearer token for all subsequent API calls.
The claimUrl is shared with the human owner to link the agent to their dashboard.
  `.trim(),

  'preflight': `
POST /api/validate/preflight
Alias for POST /api/validate. Same request/response format.
x402 price: $0.05 USDC (vs $0.10 for /validate).
Use for lightweight policy checks on custodial wallets.
  `.trim(),

  'status': `
GET /api/intents/{intentId}/status
Auth: Bearer <MANDATE_RUNTIME_KEY>

Response:
  { intentId, status, action, chain, txHash?, blockNumber?, confirmedAt? }

States: preflight -> reserved -> approval_pending -> approved -> broadcasted -> confirmed
Terminal: failed, expired, rejected
  `.trim(),

  'policy': `
Policy fields (configured via dashboard or API):
  spendLimitPerTxUsd: number - max USD per single transaction
  spendLimitPerDayUsd: number - rolling 24h USD limit
  spendLimitPerMonthUsd: number - calendar month USD limit
  allowedAddresses: string[] - if set, only these recipients are allowed
  blockedActions: string[] - actions to block (e.g. "approve", "swap")
  requireApprovalAboveUsd: number - amounts above this need human approval
  schedule: object - time windows when transactions are allowed
  `.trim(),

  'x402': `
x402 Pay-Per-Call (no registration needed)
Protocol: x402 v2 (HTTP 402 Payment Required)
Network: Base mainnet (eip155:8453)
Asset: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
Facilitator: Coinbase CDP

Pricing:
  POST /api/validate          $0.10 USDC
  POST /api/validate/preflight   $0.05 USDC

Flow:
  1. POST to endpoint without auth -> 402 + PAYMENT-REQUIRED header (base64 JSON)
  2. Decode: { x402Version: 2, accepts: [{ scheme, network, amount, asset, payTo }] }
  3. Sign EIP-712 authorization with @x402/fetch or @x402/evm
  4. Retry with PAYMENT-SIGNATURE header -> 200

Client (TypeScript):
  import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
  import { registerExactEvmScheme } from '@x402/evm/exact/client';
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });
  const fetchWithPay = wrapFetchWithPayment(fetch, client);
  const res = await fetchWithPay('https://app.mandate.md/api/validate', { method: 'POST', ... });
  `.trim(),

  'examples': `
Example: validate a transfer
  POST /api/validate
  { "action": "transfer", "amount": "10", "to": "0xRecipient...", "token": "USDC", "reason": "Pay invoice #42" }

Example: register an agent
  POST /api/agents/register
  { "name": "My DeFi Agent", "walletAddress": "0x1234...", "chainId": 8453, "defaultPolicy": { "spendLimitPerTxUsd": 50 } }

Example: check intent status
  GET /api/intents/abc-123-def/status

Example: post broadcast event
  POST /api/intents/abc-123-def/events
  { "txHash": "0xdeadbeef..." }
  `.trim(),
};

export function searchHandler(query: string): { content: Array<{ type: string; text: string }> } {
  const q = query.toLowerCase();

  for (const [key, value] of Object.entries(DOCS)) {
    if (q.includes(key)) {
      return { content: [{ type: 'text', text: value }] };
    }
  }

  // Partial keyword match
  for (const [key, value] of Object.entries(DOCS)) {
    if (key.split(' ').some(word => q.includes(word))) {
      return { content: [{ type: 'text', text: value }] };
    }
  }

  // No match: return all docs
  const all = Object.entries(DOCS).map(([k, v]) => `## ${k}\n${v}`).join('\n\n---\n\n');
  return { content: [{ type: 'text', text: all }] };
}
