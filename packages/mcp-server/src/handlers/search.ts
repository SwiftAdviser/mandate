const DOCS: Record<string, string> = {
  'validate schema': `
Validate endpoint: POST /api/validate
Required fields:
  chainId: number (84532=BaseSepolia, 8453=BaseMainnet)
  nonce: number
  to: string (0x address)
  calldata: string (0x hex)
  valueWei: string
  gasLimit: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  txType: number (2 for EIP-1559)
  accessList: array (usually [])
  intentHash: string (0x bytes32)
Response: { allowed: bool, intentId: string|null, requiresApproval: bool, blockReason: string|null }
Block reasons: per_tx_limit_exceeded, per_day_limit_exceeded, per_month_limit_exceeded, address_not_allowlisted, selector_blocked, circuit_breaker_active
  `.trim(),

  'register schema': `
Register endpoint: POST /api/agents/register (no auth required)
Fields:
  name: string
  walletAddress: string (EVM 0x..., Solana base58, or TON address)
  chainId: number | string (e.g. 84532, "solana", "ton")
  defaultPolicy?: {
    spendLimitPerTxUsd?: number
    spendLimitPerDayUsd?: number
    spendLimitPerMonthUsd?: number
  }
Response: { agentId, runtimeKey, claimUrl, walletAddress, evmAddress, chainId }
  `.trim(),

  'policy fields': `
Policy fields (set via dashboard or API):
  spendLimitPerTxUsd: number — max USD per transaction
  spendLimitPerDayUsd: number — rolling 24h USD limit
  spendLimitPerMonthUsd: number — calendar month USD limit
  allowlistedAddresses: string[] — if set, only these recipients allowed
  blockedSelectors: string[] — function selectors to block (e.g. "0xa9059cbb")
  requiresApprovalAboveUsd: number — amounts above this need human approval
  circuitBreaker: bool — if true, all txs blocked
  `.trim(),

  'x402': `
x402 Pay-Per-Call (no registration required)
Protocol: x402 v2 (HTTP 402 Payment Required)
Network: Base mainnet (eip155:8453)
Asset: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
Facilitator: Coinbase CDP

Pricing:
  POST /api/validate         $0.10 USDC
  POST /api/validate/preflight  $0.05 USDC

Flow:
  1. POST to endpoint without auth -> receive 402 + PAYMENT-REQUIRED header (base64 JSON)
  2. Decode header: { x402Version: 2, accepts: [{ scheme, network, amount, asset, payTo }] }
  3. Sign EIP-712 payment authorization using @x402/fetch or @x402/evm
  4. Retry request with PAYMENT-SIGNATURE header (base64 encoded signed payload)
  5. Server verifies via CDP facilitator -> returns 200 with validation result

Client setup (TypeScript):
  import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
  import { registerExactEvmScheme } from '@x402/evm/exact/client';
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });
  const fetchWithPay = wrapFetchWithPayment(fetch, client);
  const res = await fetchWithPay('https://app.mandate.md/api/validate', { method: 'POST', ... });

Alternative: use RuntimeKey (Bearer mndt_live_...) for free unlimited access after registration.
  `.trim(),

  'examples': `
Example validate call:
{
  "action": "validate",
  "params": {
    "chainId": 84532,
    "nonce": 42,
    "to": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "calldata": "0xa9059cbb000000000000000000000000...",
    "valueWei": "0",
    "gasLimit": "100000",
    "maxFeePerGas": "1000000000",
    "maxPriorityFeePerGas": "1000000000",
    "txType": 2,
    "accessList": [],
    "intentHash": "0xabc123..."
  }
}

Example register call:
{
  "action": "register",
  "params": {
    "name": "My DeFi Agent",
    "walletAddress": "0x1234...",
    "chainId": 84532,
    "defaultPolicy": { "spendLimitPerTxUsd": 10 }
  }
}
  `.trim(),
};

export function searchHandler(query: string): { content: Array<{ type: string; text: string }> } {
  const q = query.toLowerCase();

  for (const [key, value] of Object.entries(DOCS)) {
    if (q.includes(key.split(' ')[0]) || q.includes(key)) {
      return { content: [{ type: 'text', text: value }] };
    }
  }

  // Return all docs if no specific match
  const all = Object.entries(DOCS).map(([k, v]) => `## ${k}\n${v}`).join('\n\n---\n\n');
  return { content: [{ type: 'text', text: all }] };
}
