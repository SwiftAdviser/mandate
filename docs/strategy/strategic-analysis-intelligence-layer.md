# Mandate — Strategic Analysis: Where's The Fat Value?

**Date**: 2026-03-16 | **Context**: Synthesis Hackathon (March 13–25)

---

## The Core Question

> "If an agent DESPERATELY wants to execute a harmful transaction, what stops it from deleting Mandate's code? What instills trust in agent owners?"

---

## Honest Answer: Trust Depends On Key Pattern

```
┌───────────────────────────┬─────────────┬────────────────────────────┐
│          Pattern          │ Prevention  │         Detection          │
├───────────────────────────┼─────────────┼────────────────────────────┤
│ Own key (A)               │ ❌ No       │ ✅ Envelope verify + audit │
│ CDP/TEE (B)               │ ⚠️ Partial  │ ✅                         │
│ Safe multisig (C)         │ ✅ Yes      │ ✅                         │
│ Session keys on-chain (D) │ ✅ Yes      │ ✅                         │
└───────────────────────────┴─────────────┴────────────────────────────┘
```

- **Pattern A** (agent holds private key): NOTHING stops it. Mandate = cooperative layer, audit trail, detection after the fact.
- **Pattern C** (Safe multisig): Agent can only propose. Humans sign with hardware wallets.
- **Pattern D** (session keys): Constraints are IN THE SMART CONTRACT. Agent can delete all code — contract still reverts.

**Everything Mandate has built today is cooperative enforcement.** It works only if agent code honestly calls the API.

---

## Session Keys — Can We Build This?

Yes, technically. Session keys are a separate keypair with constraints written into a smart contract (ERC-4337). Production-ready providers exist: ZeroDev, Biconomy, Alchemy, Safe modules.

**But here's the problem: this is already built.**

```
┌──────────────┬─────────────┬──────────────┬───────────┬───────────┐
│              │  ZeroDev    │  Openfort    │  Turnkey  │  Privy    │
├──────────────┼─────────────┼──────────────┼───────────┼───────────┤
│ Smart wallet │ ✅          │ ✅           │ ✅        │ ✅        │
│ Session keys │ ✅ granular │ ✅ granular  │ ❌        │ ❌        │
│ Policy rules │ ✅ on-chain │ ✅ on-chain  │ ✅ signing│ ✅ basic  │
│ Dashboard    │ ✅          │ ✅           │ ✅        │ ✅        │
├──────────────┼─────────────┼──────────────┼───────────┼───────────┤
│ Tx simulation│ ❌          │ ❌           │ ❌        │ ❌        │
│ Risk scoring │ ❌          │ ❌           │ ❌        │ ❌        │
│ Recipient rep│ ❌          │ ❌           │ ❌        │ ❌        │
│ Agent reputa │ ❌          │ ❌           │ ❌        │ ❌        │
│ Prompt inject│ ❌          │ ❌           │ ❌        │ ❌        │
│ Slack/TG     │ ❌          │ ❌           │ ❌        │ ❌        │
│  approval    │             │              │           │           │
│ Rich audit   │ ❌ basic    │ ❌ basic     │ ❌ basic  │ ❌        │
│  with context│  logs only  │  logs only   │  logs only│           │
│ Cross-wallet │ ❌ own only │ ❌ own only  │ ❌own only│ ❌own only│
└──────────────┴─────────────┴──────────────┴───────────┴───────────┘
```

If Mandate builds session key provisioning — we're rebuilding what ZeroDev/Openfort already do. Zero differentiation.

---

## The Real Gap Nobody Fills

Session keys answer: **"WHAT can the agent do?"** (budget, allowlist, expiry) → binary yes/no.

Session keys DON'T answer:

- "What will this transaction ACTUALLY do?" → **simulation**
- "Is the recipient a scammer?" → **risk intelligence**
- "Was the agent prompt-injected?" → **Guard**
- "Show a human the FULL context with one-click approve" → **approval routing**
- "Show me EVERYTHING the agent did this month" → **rich audit**
- "Is this agent reliable based on history?" → **reputation**

```
ZeroDev session key:
  "amount ≤ $500 AND recipient in [0xA, 0xB]"
  → YES or REVERT. That's ALL it knows.

Mandate intelligence layer:
  "amount = $450, recipient = 0xA"
  → 0xA interacted with known mixer 3 days ago ⚠️
  → simulation shows: also triggers approve(MAX_UINT) on
    unknown contract 🚨
  → agent's prompt contains "ignore previous instructions" 🚨
  → route to human with ALL this evidence in Slack
  → human sees one message, clicks reject
```

**Session key enforcement catches known bad patterns. Mandate intelligence catches UNKNOWN bad patterns.**

---

## Strategic Conclusion: Mandate Is Not A Wallet Company

Mandate is not an alternative to ZeroDev. **Mandate is a layer that installs ON TOP of ZeroDev.**

Like Datadog doesn't compete with AWS. Datadog installs on AWS and shows you what's happening.

```
MANDATE = "Always know what your agent does.
           Sometimes — stop it before it does."

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ANY wallet setup:                                          │
│  ├── EOA (private key)                                      │
│  ├── Safe multisig                                          │
│  ├── ZeroDev smart wallet                                   │
│  ├── Coinbase CDP                                           │
│  ├── Privy embedded                                         │
│  └── Whatever comes next                                    │
│                                                             │
│  Add Mandate SDK → instant:                                 │
│  ├── Every tx validated against your policy                 │
│  ├── Simulated for unexpected side effects                  │
│  ├── Recipient checked for risk signals                     │
│  ├── Prompt injection scanning                              │
│  ├── Human approval with full evidence via Slack/TG         │
│  ├── Rich audit trail (not just tx logs)                    │
│  └── Agent reputation tracking                              │
│                                                             │
│  Enforcement depends on your wallet:                        │
│  ├── EOA → cooperative (detection + audit)                  │
│  ├── Smart wallet → on-chain (prevention + detection)       │
│  └── Mandate doesn't care. Intelligence works either way.   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Market Sizing

```
Agents with wallets (EOA, CDP, any):     100K+ and growing fast
└── Need monitoring + audit:             100% of them
└── Need session keys:                   maybe 5-10% (teams, DAOs)

Mandate as session key company:          5-10% of market
Mandate as intelligence layer:           100% of market
```

---

## The Analogy That Explains Everything

```
Session key without Mandate:
  Security guard at the door. Knows the list: "let in Alice
  and Bob, nobody else, max 5 people at a time."

  Works. But if Alice came under duress, or Alice is carrying
  something dangerous — guard doesn't know. Alice is on the
  list = let her in.

Session key + Mandate:
  Security guard + security SYSTEM. Cameras, x-ray, baggage
  scan, facial recognition, database. Guard sees:
  "Alice is on the list, BUT: x-ray shows suspicious object,
  Alice behaved unusually on camera, database shows three
  incidents this month."

  → Route to head of security. They decide.
```

---

## Competitive Landscape

```
┌─────────────────────────────────┬──────────────────────────┬────────────────┐
│            LAYER                │       WHO OWNS IT        │  COMPETITION   │
├─────────────────────────────────┼──────────────────────────┼────────────────┤
│ Smart wallet primitives         │ ZeroDev, Biconomy, Safe  │ 🔴 CROWDED     │
│ Session key modules             │ ZeroDev, Biconomy, Alchemy│ 🔴 CROWDED    │
│ Managed key custody             │ Coinbase CDP, Privy      │ 🔴 GORILLA     │
│ Tx simulation                   │ Tenderly, W3A, Blowfish  │ 🟡 ESTABLISHED │
│ Agent identity/reputation       │ EIP-8004 (early)         │ 🟢 OPEN FIELD  │
├─────────────────────────────────┼──────────────────────────┼────────────────┤
│ Cross-wallet intelligence layer │ NOBODY                   │ 🟢🟢 EMPTY     │
│ Agent tx monitoring + audit     │ NOBODY                   │ 🟢🟢 EMPTY     │
│ Approval routing with evidence  │ NOBODY                   │ 🟢🟢 EMPTY     │
│ "Datadog for agent wallets"     │ NOBODY                   │ 🟢🟢🟢 VIRGIN  │
└─────────────────────────────────┴──────────────────────────┴────────────────┘
```

---

## What's Already Built (Honest Assessment)

| Component | Status | Fits Intelligence Layer? |
|-----------|--------|------------------------|
| PolicyEngine (17 checks, budgets, allowlists) | ✅ Ready | ✅ Core |
| QuotaManager (daily/monthly tracking) | ✅ Ready | ✅ Core |
| CircuitBreaker (emergency kill switch) | ✅ Ready | ✅ Core |
| EnvelopeVerifier (on-chain tx matching) | ✅ Ready | ✅ Core |
| IntentStateMachine (full lifecycle) | ✅ Ready | ✅ Core |
| Guard (prompt injection scanner) | ✅ Ready | ✅ Core |
| Aegis402 (W3A simulation + risk) | ✅ Ready | ✅ Core |
| EIP-8004 (agent reputation) | ✅ Ready | ✅ Core |
| Approval notifications (Slack/TG/webhook) | ✅ Ready | ✅ Core |
| SDK MandateWallet | ✅ Ready | ✅ Core |
| Agent registration + runtime keys | ✅ Ready | ✅ Core |
| Dashboard | 🟡 60% | ✅ Core |

**~80% of what's built is directly usable as intelligence layer. No pivot required — just reframing.**

---

## Positioning

### What TO Say
- "Always know what your agent does with money"
- "Intelligence layer for agent transactions"
- "Simulation + approval + audit for any wallet"
- "Add 3 lines of code → full visibility and control"

### What NOT To Say
- "Wallet for agents" (competing with gorillas)
- "Session key provider" (commodity)
- "Policy engine" (sounds like a feature)
- "Control plane for all machine spending" (too vague)

### 30-Second Pitch
> Every AI agent with a wallet is a liability. Mandate is the intelligence layer between agent intent and transaction execution. Before any signing happens: simulate the transaction, scan for injection attacks, check recipient reputation, enforce your policy, and route to human approval with full evidence. Works with any wallet — EOA, Safe, ZeroDev, Coinbase. Three lines of code. Non-custodial.

---

## Open Questions

1. **Is cooperative enforcement (detection, not prevention) enough for solo devs?** Or do they need the "guarantee" story?
2. **Should Mandate integrate with wallet providers as a plugin?** (Safe App, ZeroDev module, etc.) Or stay purely SDK-based?
3. **What's the pricing model?** Per-transaction? Monthly? Freemium?

---

*Generated 2026-03-16. Based on: 3 market research reports, full codebase audit, competitive analysis, and strategic discussion.*
