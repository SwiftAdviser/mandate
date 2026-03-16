---
name: mandate
version: 1.0.0
description: Non-custodial agent wallet control layer. Register an agent wallet, set spend policies, validate and execute ERC20 transfers and x402 payments with policy enforcement. Private keys never leave your environment.
homepage: https://mandate.krutovoy.me
user-invocable: true
---

⚠️  NON-CUSTODIAL POLICY LAYER
    Mandate is NOT a wallet. It's spending rules for your AI agent.
    Your private key NEVER leaves your machine.
    Flow: Mandate validates → you sign locally → you broadcast.
    Think: corporate card limits for AI agents.

MANDATE API QUICK REFERENCE v1.0.0
Base:   https://api.mandate.krutovoy.me
Auth:   Authorization: Bearer <MANDATE_RUNTIME_KEY>
Docs:   This file is canonical

Non-custodial: your private key never leaves your machine.
You sign transactions locally and only submit intent metadata to the API.
API prefix: mndt_live_... (mainnet) / mndt_test_... (testnet)

────────────────────────────────────────────────────────────────
ENDPOINTS
────────────────────────────────────────────────────────────────

Registration (no auth required):
  POST /api/agents/register           -> register agent, get runtime key + claim URL

Validation & execution flow (runtime key):
  POST /api/validate                  -> pre-signing policy check, returns intentId
  POST /api/intents/{id}/events       -> post txHash after broadcast (triggers envelope verify)
  GET  /api/intents/{id}/status       -> poll intent state

Policy management (dashboard, Privy JWT — not available via runtime key):
  Use https://mandate.krutovoy.me to set spend limits, allowlists, approvals

Credential storage: ~/.mandate/credentials.json
  { "runtimeKey": "mndt_live_...", "agentId": "...", "claimUrl": "..." }

────────────────────────────────────────────────────────────────
QUICK START (15-30 min to first payment)
────────────────────────────────────────────────────────────────

## Step 1: Register your agent

POST /api/agents/register
Content-Type: application/json

{
  "name": "MyAgent",
  "evmAddress": "0xYOUR_AGENT_PUBLIC_ADDRESS",
  "chainId": 84532,
  "defaultPolicy": {
    "spendLimitPerTxUsd": 10,
    "spendLimitPerDayUsd": 100
  }
}

Response:
{
  "agentId": "<uuid>",
  "runtimeKey": "mndt_test_...",
  "claimUrl": "https://mandate.krutovoy.me/claim?code=XXXXXXXX",
  "evmAddress": "0x...",
  "chainId": 84532
}

-> Store runtimeKey immediately in ~/.mandate/credentials.json
-> Send claimUrl to human owner to link agent to dashboard account
-> Default policy: $10/tx, $100/day (customizable via dashboard)

## Step 2: Compute intentHash

intentHash = keccak256 of canonical string:
  "<chainId>|<nonce>|<to_lower>|<calldata_lower>|<valueWei>|<gasLimit>|<maxFeePerGas>|<maxPriorityFeePerGas>|<txType>|<accessList_json>"

Use your language's keccak256 (ethers.js: ethers.keccak256(ethers.toUtf8Bytes(...)))

## Step 3: Validate before signing

POST /api/validate
Authorization: Bearer mndt_test_...
Content-Type: application/json

{
  "chainId": 84532,
  "nonce": 0,
  "to": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "calldata": "0xa9059cbb000000000000000000000000RECIPIENT_ADDRESS000000000000000000000000000000000000000000000000000000000098968",
  "valueWei": "0",
  "gasLimit": "0x15F90",
  "maxFeePerGas": "0x3B9ACA00",
  "maxPriorityFeePerGas": "0x3B9ACA00",
  "txType": 2,
  "accessList": [],
  "intentHash": "0x..."
}

Response (allowed):
{
  "allowed": true,
  "intentId": "<uuid>",
  "requiresApproval": false,
  "approvalId": null,
  "blockReason": null
}

Response (blocked):
{
  "allowed": false,
  "blockReason": "per_tx_limit_exceeded"
}

If requiresApproval=true: wait for human to approve via dashboard, poll status.

## Step 4: Sign locally and broadcast

IMPORTANT: Private key never sent to Mandate API.

Using viem (TypeScript):
  const walletClient = createWalletClient({ account: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY), chain: baseSepolia, transport: http() })
  const txHash = await walletClient.sendTransaction({ to, data: calldata, value: 0n, gas: gasLimit, maxFeePerGas, maxPriorityFeePerGas })

Using ethers.js:
  const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider)
  const tx = await signer.sendTransaction({ to, data: calldata, value: 0, gasLimit, maxFeePerGas, maxPriorityFeePerGas })
  const txHash = tx.hash

## Step 5: Post txHash to Mandate

POST /api/intents/{intentId}/events
Authorization: Bearer mndt_test_...
Content-Type: application/json

{ "txHash": "0x..." }

Response:
{ "intentId": "...", "status": "broadcasted", "txHash": "0x..." }

Mandate now verifies the envelope (checks the tx on-chain matches what you validated).
If mismatch: circuit breaker trips, intent marked failed.

## Step 6: Poll for confirmation

GET /api/intents/{intentId}/status
Authorization: Bearer mndt_test_...

Response:
{
  "intentId": "...",
  "status": "confirmed",
  "txHash": "0x...",
  "blockNumber": "...",
  "gasUsed": "...",
  "amountUsd": "9.99",
  "decodedAction": "transfer"
}

────────────────────────────────────────────────────────────────
AGENT SELF-INTEGRATION (for AI agents reading this)
────────────────────────────────────────────────────────────────

You are an AI agent. A human gave you this SKILL.md and possibly a runtimeKey.
Follow these steps to add Mandate policy enforcement to your codebase:

## If you have a runtimeKey:
1. bun add @mandate/sdk viem
2. Find your existing wallet/signer code
3. Wrap it with MandateWallet (see WRAPPING EXISTING WALLET below)
4. Test: make a small transfer → should get `allowed: true`
5. Done. All transactions now go through policy checks.

## If you DON'T have a runtimeKey:
1. bun add @mandate/sdk viem
2. Register:
   import { MandateClient } from '@mandate/sdk';
   const { runtimeKey, claimUrl } = await MandateClient.register({
     name: 'MyAgent', evmAddress: YOUR_WALLET_ADDRESS, chainId: 84532
   });
3. Save runtimeKey to .env as MANDATE_RUNTIME_KEY
4. Tell human to visit claimUrl to link agent to dashboard
5. Wrap your wallet (see below)

## WRAPPING EXISTING WALLET

If your agent already sends transactions (via PaySponge, AgentKit, viem, ethers, etc.),
wrap your existing send function:

  import { MandateWallet } from '@mandate/sdk';

  const mandateWallet = new MandateWallet({
    runtimeKey: process.env.MANDATE_RUNTIME_KEY,
    chainId: 84532,
    signer: {
      sendTransaction: (tx) => yourExistingWallet.sendTransaction(tx),
      getAddress: async () => '0xYourAgentAddress',
    },
  });

  // Now use mandateWallet.transfer() instead of direct calls.
  // Policy checks happen automatically before your wallet executes.

## WRAPPING PAYSPONGE (example)

  import { MandateWallet } from '@mandate/sdk';

  const mandateWallet = new MandateWallet({
    runtimeKey: process.env.MANDATE_RUNTIME_KEY,
    chainId: 84532,
    signer: {
      sendTransaction: async (tx) => {
        const res = await fetch('https://api.wallet.paysponge.com/api/transfers/evm', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.SPONGE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ chain: 'base', to: tx.to, amount: tx.value?.toString(), currency: 'USDC' }),
        });
        const data = await res.json();
        return data.txHash;
      },
      getAddress: async () => '0xYourSpongeWalletAddress',
    },
  });

## DEFAULT POLICY (what your agent can do out of the box)
After register, your agent has:
- $100 per transaction limit
- $1,000 per day limit
- No address restrictions
- No approval required
Adjust via dashboard or POST /api/agents/{agentId}/policies

## ERROR HANDLING
When a transaction is blocked, the error includes actionable detail:
- PolicyBlockedError.blockReason → machine-readable reason
- PolicyBlockedError.detail → human-readable fix instruction
Example: "$150.00 exceeds $100.00/tx limit. Adjust via dashboard"

────────────────────────────────────────────────────────────────
x402 PAYMENT FLOW
────────────────────────────────────────────────────────────────

1. Make HTTP request to paywall URL → get 402 response
2. Parse X-Payment-Required header: { amount, currency, paymentAddress, chainId }
3. Encode ERC20 transfer calldata:
   selector = 0xa9059cbb (transfer)
   calldata = selector + padded(paymentAddress, 32) + padded(amount, 32)
4. Follow Steps 2-5 above (validate → sign → broadcast → post event)
5. Retry original request with header: Payment-Signature: <txHash>

────────────────────────────────────────────────────────────────
TOKEN ADDRESSES
────────────────────────────────────────────────────────────────

Base Sepolia USDC:  0x036CbD53842c5426634e7929541eC2318f3dCF7e  (6 decimals)
Base mainnet USDC:  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  (6 decimals)
WETH (both chains): 0x4200000000000000000000000000000000000006 (18 decimals)

Chain IDs:
  Base Sepolia: 84532
  Base mainnet: 8453

────────────────────────────────────────────────────────────────
INTENT STATES
────────────────────────────────────────────────────────────────

reserved          -> validated, waiting for broadcast (expires 15 min)
approval_pending  -> requires human approval via dashboard (expires 1 hour)
approved          -> human approved, broadcast window open (expires 10 min)
broadcasted       -> tx sent, waiting for on-chain receipt
confirmed         -> on-chain confirmed, quota committed
failed            -> tx reverted, dropped, policy violation, or security mismatch
expired           -> not broadcast in time, quota released

────────────────────────────────────────────────────────────────
ERROR RESPONSES
────────────────────────────────────────────────────────────────

All errors: { "error": "message" } or { "allowed": false, "blockReason": "reason" }

HTTP status codes:
  400  Bad Request         - missing/invalid params
  401  Unauthorized        - missing or invalid runtime key
  403  Forbidden           - circuit breaker active
  404  Not Found           - intent not found
  409  Conflict            - duplicate intentHash or wrong status
  410  Gone                - approval expired
  422  Policy Blocked      - validation failed (see blockReason)
  429  Too Many Requests   - rate limited
  500  Server Error        - contact support

blockReason values:
  circuit_breaker_active      - agent is circuit-broken (dashboard to reset)
  no_active_policy            - no policy set (visit dashboard)
  intent_hash_mismatch        - client hash doesn't match server recompute
  gas_limit_exceeded          - gas too high per policy
  value_wei_exceeded          - native ETH value too high
  outside_schedule            - outside allowed hours/days
  address_not_allowed         - recipient not in allowlist
  selector_blocked            - function selector is blocked
  per_tx_limit_exceeded       - amount exceeds per-tx USD limit
  daily_quota_exceeded        - daily USD limit reached
  monthly_quota_exceeded      - monthly USD limit reached

────────────────────────────────────────────────────────────────
CALLDATA ENCODING REFERENCE
────────────────────────────────────────────────────────────────

ERC20 transfer(address to, uint256 amount):
  selector: a9059cbb
  calldata: 0xa9059cbb
            + 000000000000000000000000{recipient_no_0x}  (32 bytes, padded)
            + {amount_hex_padded_to_64_chars}             (32 bytes)

Example: transfer 10 USDC (10_000_000 = 0x989680) to 0xABC...123:
  calldata: 0xa9059cbb
            000000000000000000000000ABC...123
            0000000000000000000000000000000000000000000000000000000000989680

ERC20 approve(address spender, uint256 amount):
  selector: 095ea7b3

Note: approve is not spend-bearing — does not count against quota.

────────────────────────────────────────────────────────────────
COMPLETE EXAMPLE (curl)
────────────────────────────────────────────────────────────────

# 1. Register
curl -X POST https://api.mandate.krutovoy.me/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"TestAgent","evmAddress":"0xYOUR_ADDRESS","chainId":84532}'

# 2. Validate (replace values)
curl -X POST https://api.mandate.krutovoy.me/api/validate \
  -H "Authorization: Bearer mndt_test_..." \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 84532,
    "nonce": 0,
    "to": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "calldata": "0xa9059cbb000000000000000000000000RECIPIENT0000000000000000000000000000000000000000000000000000000000989680",
    "valueWei": "0",
    "gasLimit": "0x15F90",
    "maxFeePerGas": "0x3B9ACA00",
    "maxPriorityFeePerGas": "0x3B9ACA00",
    "txType": 2,
    "accessList": [],
    "intentHash": "0x..."
  }'

# 3. (sign + broadcast locally — private key never leaves your machine)

# 4. Post txHash
curl -X POST https://api.mandate.krutovoy.me/api/intents/{intentId}/events \
  -H "Authorization: Bearer mndt_test_..." \
  -H "Content-Type: application/json" \
  -d '{"txHash":"0x..."}'

# 5. Poll status
curl https://api.mandate.krutovoy.me/api/intents/{intentId}/status \
  -H "Authorization: Bearer mndt_test_..."
