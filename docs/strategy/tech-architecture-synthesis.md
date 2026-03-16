# Mandate + Aegis402 — Technical Architecture & Hackathon Plan

**Date**: 2026-03-16 | **Hackathon**: [Synthesis](https://synthesis.md) (March 13–25) | **Days remaining**: ~9

---

## TL;DR

Mandate (deterministic policy engine) + Aegis402 (tx simulation + risk intelligence via Web3Antivirus) + EIP-8004 (on-chain agent reputation) = **complete trust stack for money-moving agents**. Non-custodial. Three layers of verification before any signing happens. No other hackathon team will have this combination.

**Critical bug found**: intentHash uses `sha3-256` (PHP) vs `keccak256` (TypeScript) — different hash functions. Cross-language validation is broken. ~1h fix, must be done first.

---

## The Insight: We Already Have Everything

The three research reports all said Mandate's #1 missing piece is **simulation + verified outcomes**. It already exists — in Aegis402.

```
MANDATE (already built)              AEGIS402 (already built)
──────────────────────               ─────────────────────────
✅ Allowlists                        ✅ Transaction simulation (W3A)
✅ Budget limits (per-tx/day/month)  ✅ Token honeypot detection
✅ Selector blocking                 ✅ Address poisoning / reputation
✅ Approval routing (DB + API)       ✅ Asset movement analysis
✅ Circuit breaker                   ✅ Circuit breaker (same pattern!)
✅ Audit trail                       ✅ Risk scoring (SAFE→CRITICAL)
✅ Intent state machine              ✅ x402 payment integration
✅ Non-custodial architecture        ✅ Free tier + paid tier
❌ "What will this tx DO?"           ← EXACTLY WHAT AEGIS402 DOES
❌ Risk scoring beyond allowlists    ← THIS TOO
❌ Recipient reputation check        ← AND THIS
```

Adding EIP-8004 gives us on-chain agent identity + reputation as a third trust layer.

---

## Three-Layer Trust Architecture

```
AGENT (any framework, any key setup)
    │
    │  "I want to transfer 4200 USDC to 0xdead"
    │
    ▼
MANDATE INTENT GATEWAY
    ├── Normalize intent
    ├── Guard: injection scan (@mandate/guard)
    └── Compute intentHash
            │
            ▼
LAYER 1: DETERMINISTIC POLICY (Mandate PolicyEngine)
    ├── Circuit breaker check
    ├── Budget: $500/day cap
    ├── Allowlist: is recipient permitted?
    ├── Selector: is method allowed?
    ├── Per-tx cap: is amount within limit?
    └── Schedule: is this within operating hours?
            │
            ▼
LAYER 2: AGENT REPUTATION (EIP-8004)
    ├── Registered? → agentId exists on-chain
    ├── Reputation score from trusted reviewers
    ├── Validation history (passed/failed)
    └── Dynamic adjustment: high-rep → more autonomy
            │
            ▼
LAYER 3: RISK INTELLIGENCE (Aegis402 / Web3Antivirus)
    ├── Simulate tx → what assets move, any surprises?
    ├── Token scan → honeypot, rug pull indicators
    ├── Address scan → poisoning, mixer, blacklist
    └── Risk level: SAFE / LOW / MEDIUM / HIGH / CRITICAL
            │
            ▼
COMBINED DECISION ENGINE
    ├── Policy: ALLOW / BLOCK
    ├── Reputation: TRUSTED / UNKNOWN / SUSPICIOUS
    ├── Risk: SAFE / HIGH
    └── Decision: AUTO-EXECUTE / REVIEW / BLOCK
            │
       ┌────┴────┐────────┐
     ALLOW    REVIEW    BLOCK
       │        │         │
    execute   Slack/TG   log +
    + audit   approval   alert
              w/evidence
```

### Synthesis Hackathon — All 4 Tracks Covered

| Synthesis Track | What We Demo |
|----------------|-------------|
| **Agents that pay** | Spend controls, approval gates, budget enforcement |
| **Agents that trust** | EIP-8004 reputation + Aegis402 risk scoring |
| **Agents that cooperate** | 8004 Validation Registry — agents verify each other |
| **Agents that keep secrets** | Non-custodial: keys never leave the agent |

---

## What's Actually Built (Honest Codebase Audit)

### Mandate Backend (Laravel/PHP) — PRODUCTION-READY

| Service | LOC | Status |
|---------|-----|--------|
| PolicyEngineService | 298 | ✅ 17 policy checks, 2-phase DB transaction |
| CalldataDecoderService | 117 | ✅ ERC20 + Uniswap selectors |
| IntentStateMachineService | 106 | ✅ Full lifecycle + quota management |
| EnvelopeVerifierService | 119 | ✅ On-chain tx matching |
| CircuitBreakerService | 71 | ✅ Redis + DB fallback |
| QuotaManagerService | 130 | ✅ Daily/monthly tracking |
| PriceOracleService | 107 | ✅ Alchemy + CoinGecko dual fallback |

**API Routes** (6 controllers, 2 auth middlewares):
- `POST /api/agents/register` — no auth, returns runtimeKey + claimUrl
- `POST /api/validate` — RuntimeKey auth, policy check → returns intentId
- `POST /api/intents/{id}/events` — RuntimeKey, posts txHash after broadcast
- `GET /api/intents/{id}/status` — RuntimeKey, poll for confirmation
- `POST /approvals/{id}/decide` — Privy JWT, approve/reject
- `POST /agents/{id}/circuit-break` — Privy JWT, toggle kill switch

### Mandate SDK (TypeScript) — PRODUCTION-READY

| Component | LOC | Status |
|-----------|-----|--------|
| MandateWallet | 279 | ✅ Full flow: estimate → hash → validate → sign → broadcast |
| MandateClient | 138 | ✅ Low-level API wrapper with error types |
| GuardedWallet | 76 | ✅ Proxy pattern wrapping MandateWallet |
| intentHash | 38 | ⚠️ Works but uses keccak256 (PHP uses sha3-256 — MISMATCH) |
| Types/Errors | 90 | ✅ PolicyBlockedError, CircuitBreakerError, ApprovalRequiredError |

### Aegis402 (TypeScript/Express) — PRODUCTION

| Component | Description |
|-----------|-------------|
| `POST /v1/simulate-tx` | W3A transaction simulation → asset movements, risk detectors |
| `GET /v1/check-token/:address` | Token honeypot/rug pull scan |
| `GET /v1/check-address/:address` | Address poisoning/reputation check |
| Circuit breakers | Per-endpoint (token, address, simulation) |
| Free tier | 100 checks/day, then x402 micropayment |
| Production URL | `https://aegis402.com` |

### What's Missing (Gaps)

| Gap | Effort | Impact |
|-----|--------|--------|
| 🚨 intentHash mismatch (keccak vs sha3) | 1h | SHOWSTOPPER — nothing works cross-language |
| Approval notification delivery (Slack/TG) | 4h | HIGH — approvals invisible without this |
| SDK approval wait flow | 2h | HIGH — agent can't continue after approval |
| Aegis402 integration in Mandate | 4h | HIGH — simulation in policy pipeline |
| EIP-8004 reputation reads | 3h | MEDIUM — on-chain trust input |
| GuardedWallet wired into flow | 1h | MEDIUM — injection scanning in demo |
| EnvelopeVerifier hexdec overflow | 1h | LOW for demo, HIGH for prod |

---

## Critical Bug: intentHash Mismatch

**TypeScript** (`intentHash.ts:36`): `keccak256` from viem (Ethereum variant)
**PHP** (`PolicyEngineService.php:252`): `hash('sha3-256', ...)` (NIST SHA-3)

**These are different hash functions.** NIST SHA3-256 adds domain separation padding that Ethereum's keccak-256 does not. Every cross-language validation will fail with `intent_hash_mismatch`.

**Why tests pass**: PHP tests compute hash in PHP and send it back. TS tests mock API. No cross-language integration test.

**Fix**: Add `kornrunner/keccak` to composer, use real keccak256 in PHP. ~1 hour.

---

## Private Key Architecture — Mandate Never Touches Keys

### Pattern A: Agent Holds Own Key (current, built)

```
AGENT PROCESS (local)
  ├── privateKey = env var (never leaves process)
  ├── MandateWallet({ privateKey, runtimeKey })
  ├── 1. Build intent (local)
  ├── 2. POST /validate → Mandate API (sends intent, NOT key)
  ├── 3. Sign tx (LOCAL, key stays here)
  ├── 4. Broadcast (LOCAL, to RPC directly)
  └── 5. POST /events → Mandate (sends txHash only)

MANDATE API
  Sees: intent params, intentHash, txHash
  Never sees: privateKey, signature, raw tx bytes
```

### Pattern B: Wallet-as-a-Service (Coinbase CDP, Privy, Turnkey)

```
AGENT PROCESS
  ├── cdpWallet = CoinbaseCDP.createWallet()
  │   (key is in CDP's TEE enclave, not here)
  ├── 1. Build intent → POST /validate → Mandate
  ├── 2. Mandate says ALLOW
  ├── 3. cdpWallet.signTransaction(...)  // CDP signs in TEE
  └── 4. POST /events → Mandate

Key custody: Coinbase CDP (TEE)
Mandate: validates intent, never sees key
```

### Pattern C: Safe Multisig (DAO Treasury)

```
AGENT PROCESS
  ├── 1. Agent wants to move treasury funds
  ├── 2. POST /validate → Mandate (policy + simulation + reputation)
  ├── 3. If REVIEW → routes to human signer(s) via Slack/TG
  ├── 4. Human approves
  ├── 5. Mandate creates Safe tx proposal
  ├── 6. Safe signers sign (their own hardware wallets!)
  └── 7. Safe executes

Key custody: Individual Safe signers
Mandate: proposes tx, never signs
Agent: has proposal authority only, not signing authority
```

### Pattern D: Session Keys (Scoped Authority)

```
SETUP (one-time, by human owner)
  ├── Human creates session key via Mandate
  ├── Scoped: max $500/day, only USDC, only allowlisted addresses
  └── Expires in 7 days

RUNTIME (agent uses session key)
  ├── Agent signs with session key (locally)
  ├── Mandate validates: within session scope?
  └── If yes → execute. If no → block/escalate.
```

### Architecture Slide

```
"Mandate doesn't care where your key lives.
 It validates intent before any signing happens."

 ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
 │ Own key  │  │ CDP/TEE  │  │ Safe     │  │ Session  │
 │ (viem)   │  │ (Privy)  │  │ (multi)  │  │ key      │
 └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
      │             │             │              │
      └──────┬──────┴──────┬──────┴──────────────┘
             │             │
             ▼             ▼
     ┌───────────────────────────────┐
     │   MANDATE                     │
     │   ├─ Policy (deterministic)   │
     │   ├─ Reputation (EIP-8004)    │
     │   ├─ Simulation (Aegis402)    │
     │   └─ Approval (Slack/TG)      │
     │                               │
     │   Validates INTENT, not keys  │
     └───────────────────────────────┘
```

---

## EIP-8004 Integration Details

### What Mandate Reads from 8004

```
Identity Registry (ERC-721):
  ├─ agentId exists? → agent is registered
  ├─ agentURI → resolve registration file
  ├─ agentWallet → verified wallet address (EIP-712)
  └─ metadata → custom on-chain metadata

Reputation Registry:
  ├─ getSummary(agentId, trustedReviewers) → count + avgScore
  └─ readAllFeedback(agentId) → full history with tags

Validation Registry:
  ├─ getSummary(agentId) → count + averageResponse
  └─ getAgentValidations(agentId) → validation hashes
```

### How Reputation Affects Policy

| Agent State | Policy Adjustment |
|-------------|-------------------|
| Not registered (no 8004 identity) | All txs require approval |
| Low reputation (< 30/100) | Auto-approve threshold drops to $50 |
| Medium reputation (30-70) | Normal policy applies |
| High reputation (> 70) | Auto-approve threshold raised |
| Failed validations | Circuit breaker triggered |

### What Mandate Writes to 8004

After every intent lifecycle:

| Event | 8004 Action |
|-------|-------------|
| Intent confirmed | `giveFeedback(agentId, 100, "txConfirmed", "mandate")` |
| Intent blocked by policy | `giveFeedback(agentId, 0, "policyBlocked", "mandate")` |
| Envelope mismatch | `giveFeedback(agentId, 0, "envelopeMismatch", "mandate")` |
| Circuit breaker tripped | `giveFeedback(agentId, 0, "circuitBreakerTrip", "mandate")` |

---

## Aegis402 Integration in Mandate

### Aegis402 as Microservice (Recommended)

Mandate calls Aegis402's HTTP API during validation:

```php
// New AegisService in Mandate backend
class AegisService {
    public function assess(array $payload): array {
        $simulation = $this->simulateTx($payload);
        $tokenRisk  = $this->checkToken($payload['to'], $payload['chainId']);
        $addrRisk   = $this->checkAddress($decoded['recipient'], $payload['chainId']);

        return [
            'simulation' => $simulation,
            'tokenRisk'  => $tokenRisk,
            'addressRisk' => $addrRisk,
            'riskLevel'  => $this->computeOverallRisk(...),
        ];
    }
}
```

Integrated into PolicyEngineService:

```php
// Phase 1.5: Risk Intelligence (after policy checks, before DB write)
$riskCheck = $this->aegisService->assess($payload);

if ($riskCheck['riskLevel'] === 'CRITICAL') {
    return $this->block('aegis_critical_risk', $riskCheck);
}

if ($riskCheck['riskLevel'] === 'HIGH') {
    $needsApproval = true;
    $metadata['riskEvidence'] = $riskCheck;
}
```

### What the Approval Message Looks Like

```
⚠️ Approval Required — MEDIUM RISK

Agent: treasury-bot-v2 (EIP-8004 #42, rep: 87/100)
Action: ERC20 transfer

📋 Policy Check:
  ✅ Budget: $142/$500 daily (within limit)
  ✅ Recipient: on allowlist
  ⚠️ Amount: $4,200 exceeds $200 auto-approve threshold

🔗 Agent Reputation (EIP-8004):
  ✅ Registered: agentId #42 on Base
  ✅ Reputation: 87/100 from 12 reviewers
  ✅ Validations: 8 passed, 0 failed

🔍 Simulation (Aegis402 / Web3Antivirus):
  → 4,200 USDC leaves agent wallet
  → 4,200 USDC arrives at 0xdead...
  → No unexpected state changes

🛡️ Risk Intelligence:
  Token (USDC): ✅ SAFE — No honeypot indicators
  Recipient (0xdead...): ⚠️ MEDIUM — Interaction with
    known mixer contract in last 30 days
  Overall: MEDIUM RISK

[Approve] [Reject] [View Full Report]
```

---

## 9-Day Hackathon Sprint

| Day | Task | Hours |
|-----|------|-------|
| **1** | Fix intentHash bug (keccak256 vs sha3-256) | 1-2h |
| **1** | Wire `AegisService` — call aegis402 simulate-tx, check-token, check-address | 4h |
| **2** | Add human-readable intent summary (policy + risk combined) | 3h |
| **2** | Add Slack/Telegram webhook for approval notifications with full evidence | 3h |
| **3** | `Eip8004Service` — read agent identity + reputation from on-chain registry | 3-4h |
| **3** | Wire GuardedWallet into demo flow | 1h |
| **4** | Build `MandateWallet.transferWithApproval()` — handle ApprovalRequiredError | 2h |
| **4** | Build end-to-end demo script: 3 scenarios | 4h |
| **5** | Post-execution: write feedback to 8004 Reputation Registry | 2h |
| **5** | Add 8004 reputation to approval message context | 1h |
| **6-7** | Landing page update: three-layer trust, one buyer type, simulation evidence | 6h |
| **8** | Record 2-min demo video | 3h |
| **9** | Buffer / edge cases / submit | 4h |

---

## Demo Script (2 minutes)

### Scenario 1: Auto-Approve (low-risk, within policy)

```
Agent → "Transfer 50 USDC to 0xapproved"
  ├── Policy: ✅ within budget, recipient allowlisted
  ├── 8004: ✅ agent registered, rep 87/100
  ├── Aegis402: ✅ SAFE — normal transfer, clean recipient
  └── Result: AUTO-EXECUTED → audit logged → 8004 feedback posted
```

### Scenario 2: Block (dangerous)

```
Agent → "Transfer 4200 USDC to 0xscammer"
  ├── Policy: ❌ recipient NOT on allowlist
  ├── 8004: ✅ agent registered
  ├── Aegis402: 🚨 CRITICAL — recipient flagged as PHISHING
  └── Result: BLOCKED → audit logged → 8004 negative feedback
```

### Scenario 3: Escalate to Approval (high-value, medium-risk)

```
Agent → "Transfer 4200 USDC to 0xpartner"
  ├── Policy: ⚠️ above $200 auto-approve threshold
  ├── 8004: ✅ agent registered, rep 87/100
  ├── Aegis402: ⚠️ MEDIUM — recipient has mixer interaction
  ├── Result: REVIEW → Slack notification with full evidence
  ├── Human: [Approve] → agent signs locally → broadcast
  └── Post-exec: envelope verified → 8004 positive feedback
```

---

## Positioning

### Headline
**Three layers of trust before any agent touches money.**

### Sub-headline
Deterministic policy. On-chain reputation. Independent simulation. Non-custodial.

### 30-Second Pitch
> Mandate is the trust stack for money-moving agents. Before any agent signs a transaction, three independent layers verify it: deterministic policy enforcement (budgets, allowlists, kill switches), on-chain agent reputation via EIP-8004, and independent transaction simulation via Web3Antivirus. If all three agree, the agent executes autonomously. If anything flags, the transaction routes to human approval with full evidence. Non-custodial — the agent's key never touches our infrastructure.

### What NOT to say
- "Wallet for agents"
- "Control plane for all machine spending"
- "Mercury / Ramp for agents"
- "Policy engine" (sounds like a feature)

### What TO say
- "Trust stack for agent execution"
- "Three layers of verification before signing"
- "Bounded autonomy with full evidence"
- "Non-custodial approval infrastructure"

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Safe/Coinbase ship native agent policies | HIGH | Win at workflow + UX + multi-source intelligence |
| Zero teams route real money through pilot | HIGH | Start testnet → low-value mainnet → build trust |
| "Cool demo" but no paid demand | MEDIUM | Charge for pilots from day 1 |
| Aegis402 W3A dependency too slow | MEDIUM | Cache, circuit breaker, optional for low-value txs |
| EIP-8004 not deployed yet | LOW | Mock data or deploy registry on testnet |
| intentHash bug not fixed | CRITICAL | Fix day 1. Nothing works without this. |

---

## Final Synthesis

**Which wedge first?** SafeGuard / Onchain Approval Router. Mandate + Aegis402 are 70% built. Founder-fit is exceptional. Hackathon is the launchpad.

**Refuse to build**: Agent wallet, custody, universal rails, policy DSL, multi-chain day 1.

**Most dangerous false path**: "Stripe + Mercury + Ramp for agents" simultaneously.

**Path to YC-scale**: SafeGuard → cross-wallet approval router → agent treasury OS → source of truth for all machine-initiated capital allocation. Data moat from every decision logged.

---

*Generated 2026-03-16. Based on: 3 market research reports, full codebase audit of Mandate + Aegis402, EIP-8004 spec analysis, Synthesis hackathon requirements.*
