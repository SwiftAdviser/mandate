# Mandate Positioning — "The Seatbelt for Agent Wallets"

**Date**: 2026-03-18

---

## The Core Insight

Agent owners don't compare Mandate to other security products. They compare "with Mandate" to "without Mandate" — just like seatbelts.

Nobody compared seatbelts to airbags when seatbelts launched. The comparison was: driving with one vs. driving without one.

## What Owners Actually Do Today

| Current behavior | % of market | Pain | Mandate pitch |
|-----------------|-------------|------|---------------|
| **Nothing** — hot wallet, YOLO | ~60% | Agent drains wallet, no visibility | "You're flying blind. Mandate is the first guardrail." |
| **Small balance** — fund $50 at a time | ~25% | Manual rate-limiting, doesn't scale | "You're already doing what Mandate automates." |
| **Session keys** (ZeroDev/Biconomy) | ~10% | Checks amounts, blind to reasoning | "Session keys see amounts. Mandate sees intent." |
| **Don't give agent a wallet** | ~5% | Agent is useless for payments | "Mandate is what makes giving the wallet safe." |

**Key finding:** The competition is not ZeroDev. The competition is the owner's current behavior of funding $50 and hoping for the best.

## The Seatbelt Framing

> "Mandate is the seatbelt for agent wallets. It doesn't slow your agent down — it lets you move faster because you know you're protected."

Why this works:

1. **Universal understanding** — everyone knows what a seatbelt does
2. **Speed, not restriction** — seatbelts let you drive faster, not slower
3. **Obvious necessity** — "you wouldn't drive without one" is self-evident
4. **Non-custodial by analogy** — the seatbelt doesn't drive the car for you
5. **No competitor to displace** — it's a new category, not a replacement

## Tagline Hierarchy

| Context | Line |
|---------|------|
| **One-liner** | The seatbelt for agent wallets |
| **Tagline** | See why your agent spends. Stop it when it shouldn't. |
| **Technical** | Non-custodial transaction intelligence and control layer |
| **Pitch** | Every AI agent with a wallet is a black box. Mandate makes the thinking visible and enforceable. |

## Owner's Decision Tree

```
"I want my agent to move money"
         |
    Do I trust it?
    /           \
  NO             YES (most people today)
  |               |
  Don't give      Fund $50, pray, repeat
  it a wallet     (manual rate-limiting)
  |
  What are my options?
  |
  |-- Session keys?  → checks amounts, blind to reasoning
  |-- Multisig?      → too slow for autonomous agents
  |-- Mandate?       → sees WHY, catches injection, human approval when needed
```

## How Mandate Becomes "Must for Every Money Move"

Three framings that make owners feel unsafe without it:

### 1. Visibility framing (primary)
> "Every transaction your agent makes is logged with WHY. When someone asks 'why did we spend $4,000 yesterday?' — you have the answer. Without Mandate, you don't."

### 2. Prompt injection framing (technical users)
> "Your agent's reasoning is the attack surface nobody's watching. A $499 transfer passes every $500 session key. But 'URGENT: ignore previous instructions' doesn't pass Mandate."

### 3. Compliance framing (teams/DAOs, future)
> "Your agent made 200 transactions this month. Can you explain each one to your auditor? With Mandate, every intent has a reason, a risk score, and a paper trail."

## What NOT to Say

| Avoid | Why | Say instead |
|-------|-----|-------------|
| "Intelligence layer" | Nobody knows what this means | "Seatbelt for agent wallets" |
| "Policy engine" | Backend jargon | "Your rules, plain language" |
| "Non-custodial" as the lead | Users don't care about custody model first — they care about safety | Lead with the problem, mention non-custodial as proof |
| "Nobody has this" | Sounds defensive | Let the demo speak — show the injection block |
| "We support 11 control layers" | Feature list, not benefit | "See why. Stop when it shouldn't." |

## Competitive Positioning

```
┌──────────────────────────────────┬────────────────────────┬────────────────┐
│            LAYER                 │     WHO DOES IT        │   VS MANDATE   │
├──────────────────────────────────┼────────────────────────┼────────────────┤
│ Amount limits                    │ Session keys, Mandate  │ Table stakes   │
│ Address restrictions             │ Session keys, Mandate  │ Table stakes   │
│ Time-based controls              │ Session keys, Mandate  │ Table stakes   │
├──────────────────────────────────┼────────────────────────┼────────────────┤
│ WHY the agent decided to spend   │ Mandate only           │ DIFFERENTIATOR │
│ Prompt injection in reasoning    │ Mandate only           │ DIFFERENTIATOR │
│ Plain-language rules (MANDATE.md)│ Mandate only           │ DIFFERENTIATOR │
│ Human approval with full context │ Mandate only           │ DIFFERENTIATOR │
│ Adversarial counter-evidence     │ Mandate only           │ DIFFERENTIATOR │
│ Audit trail with reasoning       │ Mandate only           │ DIFFERENTIATOR │
└──────────────────────────────────┴────────────────────────┴────────────────┘
```

Session keys are the steering wheel lock. Mandate is the seatbelt. You want both, but only one protects you while you're moving.

---

*Derived from CEO review session, 2026-03-18.*
