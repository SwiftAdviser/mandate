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
