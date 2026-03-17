# CEO Review: Where's The Fat Value With Zero Competition?

**Date**: 2026-03-16 | **Context**: Strategic review of Mandate's positioning, trust model, and session key pivot

---

## The Core Question

> "If an agent DESPERATELY wants to execute a harmful transaction, what stops it from deleting the code? What will instill trust in agent owners?"

---

## Honest Answer By Key Pattern

```
┌───────────────────────────┬─────────────┬────────────────────────────┐
│          Pattern          │ Prevention  │         Detection          │
├───────────────────────────┼─────────────┼────────────────────────────┤
│ Own key (A)               │ ❌ No       │ ✅ Envelope verify + audit │
├───────────────────────────┼─────────────┼────────────────────────────┤
│ CDP/TEE (B)               │ ⚠️ Partial  │ ✅                         │
├───────────────────────────┼─────────────┼────────────────────────────┤
│ Safe multisig (C)         │ ✅ Yes      │ ✅                         │
├───────────────────────────┼─────────────┼────────────────────────────┤
│ Session keys on-chain (D) │ ✅ Yes      │ ✅                         │
└───────────────────────────┴─────────────┴────────────────────────────┘
```

- **Pattern A** (agent holds private key): NOTHING stops it. Agent can bypass Mandate entirely. Mandate = cooperative layer, audit trail, detection after the fact.
- **Pattern C** (Safe multisig): Agent can only propose. Humans sign with hardware wallets. Deleting Mandate = losing proposal ability, but can't sign anyway.
- **Pattern D** (session keys): Constraints are IN THE SMART CONTRACT. Agent can delete all code — contract still reverts out-of-scope txs.

**Everything Mandate has built today is cooperative enforcement. It works only if agent code honestly calls the API.**

---

## Competitive Landscape — Where Nobody Is Building

```
┌─────────────────────────────────┬──────────────────────────┬─────────────────────┐
│            LAYER                │       WHO OWNS IT        │   COMPETITION       │
├─────────────────────────────────┼──────────────────────────┼─────────────────────┤
│ Smart wallet primitives         │ ZeroDev, Biconomy, Safe  │ 🔴 CROWDED          │
│ Session key modules             │ ZeroDev, Biconomy, Alchemy│ 🔴 CROWDED         │
│ Managed key custody             │ Coinbase CDP, Privy      │ 🔴 GORILLA          │
│ Tx simulation                   │ Tenderly, W3A, Blowfish  │ 🟡 ESTABLISHED      │
│ Agent identity/reputation       │ EIP-8004 (early)         │ 🟢 OPEN FIELD       │
├─────────────────────────────────┼──────────────────────────┼─────────────────────┤
│ Policy → session key TRANSLATOR │ NOBODY                   │ 🟢🟢 EMPTY          │
│ Cross-wallet approval UX        │ NOBODY                   │ 🟢🟢 EMPTY          │
│ Intelligence layer ABOVE        │ NOBODY                   │ 🟢🟢 EMPTY          │
│   on-chain enforcement          │                          │                     │
│ "Configure in dashboard,        │ NOBODY                   │ 🟢🟢🟢 VIRGIN       │
│  enforce on-chain"              │                          │                     │
└─────────────────────────────────┴──────────────────────────┴─────────────────────┘
```

---

## The Fattest Value Chunk

**"Human configures policy in dashboard → Mandate translates to on-chain session key → agent gets scoped authority → can't exceed it even if hacked"**

Nobody builds this bridge. ZeroDev gives `toCallPolicy({ permissions: [...] })` — raw code. Safe gives modules — raw contracts. Biconomy — same. No UX. No intelligence. No orchestration.

### Mandate = UX + Intelligence + Orchestration ABOVE On-Chain Enforcement

```
┌─────────────────────────────────────────────────────────────┐
│  MANDATE'S ACTUAL VALUE (the empty space nobody occupies)   │
│                                                             │
│  1. TRANSLATE: Human-readable policy → on-chain constraints │
│     "max $500/day to these 3 addresses"                     │
│     → toCallPolicy({ permissions: [...] })                  │
│     → deployed on smart contract                            │
│                                                             │
│  2. INTELLIGENCE: What on-chain CAN'T do                    │
│     - Simulation: "what will this tx actually DO?"          │
│     - Reputation: "has this agent been reliable?"           │
│     - Guard: "was this intent injected?"                    │
│     - Risk scoring: "is recipient clean?"                   │
│                                                             │
│  3. ORCHESTRATE: Approval routing with evidence             │
│     - Slack/TG notification with full context               │
│     - Human approves/rejects with one click                 │
│     - Audit trail of every decision                         │
│                                                             │
│  4. ABSTRACT: Wallet-agnostic                               │
│     - Same dashboard, same policies                         │
│     - Works with ZeroDev, Safe, Biconomy, CDP               │
│     - Owner doesn't care about implementation               │
└─────────────────────────────────────────────────────────────┘
```

---

## The Trust Answer (One Slide)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  "What if the agent deletes Mandate's code?"             │
│                                                          │
│  WITHOUT session keys:                                   │
│    Agent has private key → deletes code → signs directly │
│    → game over, nothing stops it                         │
│    Mandate = audit trail (detection after the fact)      │
│                                                          │
│  WITH session keys (what we build):                      │
│    Agent has SESSION key → deletes ALL code →            │
│    → tries to send $10k → REVERT on-chain               │
│    → tries new recipient → REVERT on-chain              │
│    → tries after expiry → REVERT on-chain               │
│    → The limits are IN THE SMART CONTRACT                │
│    → Our servers can be off. Limits still hold.          │
│                                                          │
│  This is the ONLY answer that creates trust.             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Session Keys — How It Works

```
Human Owner (full authority)
    │
    ├── Creates session key with policy:
    │     max $500/day, only USDC, only 3 addresses, expires in 7 days
    │
    ▼
Smart Contract Wallet (ERC-4337)
    │
    ├── Session Key Validator Module (ON-CHAIN)
    │     Checks: amount? recipient? method? expiry? budget?
    │     If out of scope → REVERT (on-chain, unhackable by agent)
    │
    ▼
Agent gets session key (private key of limited scope)
    ├── Signs tx locally
    ├── Submits UserOperation to bundler
    └── Contract validates → execute or revert
```

### Existing Infrastructure (Production-Ready)

| Provider | What It Gives | Session Keys |
|----------|--------------|-------------|
| ZeroDev (Kernel v3) | ERC-4337 smart wallet + permission system | Granular policies on-chain |
| Biconomy | Smart accounts + session key module | Rules + ABI-level restrictions |
| Alchemy (Modular Account) | ERC-6900 modular smart account | Session key plugin |
| Safe + Session Key Module | Safe{Core} protocol modules | Custom validator modules |

Standards: ERC-7715 (wallet_grantPermissions), ERC-7710 (delegated permissions framework).

### Mandate's Role (Orchestrator, Not Competitor)

```
┌─────────────────────────────────────────────┐
│  MANDATE DASHBOARD                          │
│                                             │
│  Human owner configures policy:             │
│  ├── Budget: $500/day                       │
│  ├── Allowlist: [0xA, 0xB, 0xC]            │
│  ├── Methods: transfer only                 │
│  ├── Expiry: 7 days                         │
│  └── Chain: Base                            │
│                                             │
│  [Create Session Key] ←─── button           │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  MANDATE BACKEND                             │
│                                              │
│  1. Translate Mandate policy → session key   │
│     permission object (ZeroDev/Biconomy fmt) │
│  2. Call wallet SDK to register session key  │
│     on smart contract (on-chain tx)          │
│  3. Generate session key pair                │
│  4. Return session private key to agent      │
│  5. Store session metadata for audit         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  ON-CHAIN (immutable enforcement)            │
│                                              │
│  Smart Contract Wallet                       │
│  └── Session Key Validator                   │
│      ├── checkBudget(amount) ← on-chain      │
│      ├── checkRecipient(to) ← on-chain       │
│      ├── checkSelector(method) ← on-chain    │
│      └── checkExpiry(now) ← on-chain         │
│                                              │
│  Agent submits UserOp → validates → execute  │
│  Agent submits bad UserOp → REVERT           │
└──────────────────────────────────────────────┘
```

### Two Layers of Enforcement

| Layer | What It Checks | Bypassable? |
|-------|---------------|-------------|
| Mandate API (off-chain) | Simulation, reputation (8004), Guard (injection), complex logic | Theoretically yes (skip API call) |
| Session Key Validator (on-chain) | Budget, allowlist, method, expiry | Impossible |

Mandate adds intelligence on top of on-chain enforcement:
- On-chain: "recipient in allowlist and amount < $500" — yes/no
- Mandate: "recipient clean per Aegis402, agent reputation 87/100, no prompt injection, simulation shows expected outcome"

---

## Dream State Mapping

```
CURRENT STATE                    PIVOT                         12-MONTH IDEAL
─────────────────                ──────────────                ─────────────────
Cooperative middleware     →     Session key              →    On-chain enforced
that works only if agent         orchestration +               authority scoping
code calls it honestly           intelligence layer            where agent PHYSICALLY
                                                               cannot exceed bounds

Detection, not prevention  →    Prevention + detection   →    Prevention + detection
                                 + intelligence                + intelligence + UX

"Please follow the rules"  →    "Rules are in the        →    "Delete our servers.
                                 smart contract"               Limits still hold."
```

---

## What Mandate Already Has vs. What The Pivot Needs

```
ALREADY BUILT (reusable)                  NEEDS BUILDING
────────────────────────                  ──────────────────
PolicyEngine → becomes policy TRANSLATOR  PolicyToSessionKey mapper
QuotaManager → stays for accounting       ZeroDev SDK integration
CircuitBreaker → stays (kill switch)      Session key provisioning endpoint
EnvelopeVerifier → stays (detection)      Smart wallet factory/connector
IntentStateMachine → stays (lifecycle)    UserOp submission flow
Approval routing → stays (for REVIEW)     Bundler integration
Guard → stays (injection scanning)        Gas sponsorship (paymaster)
Aegis402 → stays (simulation)
Dashboard → stays (configure policies)
SDK MandateWallet → adapts to session key signing
```

~80% of existing code is reusable. The pivot is additive, not a rewrite.

---

## Hackathon Strategy

### For hackathon demo: mock the ZeroDev integration, show the vision
- Demo the policy → session key translation UX
- Show on-chain revert when agent exceeds bounds (can use testnet)
- Full intelligence layer is REAL (Aegis402 simulation, Guard, reputation)
- Approval routing with Slack is REAL

### Post-hackathon: wire ZeroDev for real (~2-3 days)
1. Integrate ZeroDev SDK (most developer-friendly) — 4h
2. PolicyToSessionKey mapper — 4h
3. `POST /api/agents/{id}/session-key` endpoint — 3h
4. End-to-end: agent with session key exceeds limit → on-chain revert — 2h

---

## Pitch Angle

Instead of "we check transactions" →

> "Mandate creates cryptographically scoped authority for agents. The budget isn't in our database — it's in the smart contract. Delete our servers — the limits still hold."

### What TO Say
- "Trust stack for agent execution"
- "Three layers of verification before signing"
- "Bounded autonomy with full evidence"
- "Configure in dashboard, enforce on-chain"

### What NOT To Say
- "Wallet for agents"
- "Policy engine" (sounds like a feature)
- "Mercury / Ramp for agents"
- "Control plane for all machine spending"

---

## Mode Recommendation

**EXPANSION (A)**. The cooperative middleware story doesn't survive the "what if agent deletes the code?" question from any serious judge or investor. Session key orchestration is the ONLY defensible position, it's an empty field, and it reuses 80% of what's built.

---

*Generated 2026-03-16. Based on: strategy docs analysis, codebase audit, competitive landscape mapping, and the fundamental trust question.*
