# Mandate: Positioning Statement

**Date**: 2026-03-26 | **Method**: Structured positioning exercise + CEO review
**Revision**: v2 (CEO review resolved 4 contradictions with prior strategy docs)

---

## The customer test

Developers aren't comparing Mandate to another product. They're comparing it to funding $50 and hoping nothing goes wrong. They pick Mandate because prompt injection is real: the Lobster incident ($450K lost) and OpenClaw vulnerabilities proved that spending caps don't stop reasoning attacks. The agent's "why" is the attack surface nobody else watches.

## The honest gap

Mandate is cooperative enforcement. It works when agent code calls the API. A compromised agent that bypasses Mandate entirely is outside the enforcement boundary.

The answer is the trust spectrum: with EOA wallets, Mandate provides detection and audit. With smart wallets (Safe, ZeroDev), Mandate adds intelligence on top of on-chain enforcement. The architecture works at every trust level. Enforcement strength depends on your wallet. Mandate adds the brain. Your wallet provides the muscle.

This is a real limitation, not a theoretical one. Positioning it honestly is stronger than hiding it.

## The core bet

Transaction intelligence. Mandate is the only layer that combines simulation, reasoning analysis, risk scoring, and approval routing for crypto agent wallets. Session keys enforce limits. Mandate understands WHY the agent is spending and whether the transaction is safe.

This is broader than prompt injection scanning (one signal among many). The full stack: simulate the transaction, scan agent reasoning for manipulation, score recipient risk, route to human approval with evidence, log everything with context.

## Market scope

Crypto agent wallets. Not fiat. Not full governance. Developers building autonomous agents with on-chain wallets on EVM chains.

Fiat agent spending (Stripe MPP, Ramp, Brex) is a different market with different gorillas. We don't compete there. If the market expands to fiat, that's a roadmap decision, not a positioning claim.

## Positioning statement

**We help crypto agent developers understand and control agent spending through transaction intelligence, unlike wallets that only enforce limits.**

### Prior draft vs. final

> **Draft (Mar 25):** "We help AI agent developers catch manipulated spending by scanning agent reasoning, unlike wallets that only check amounts."

> **Final (Mar 26):** "We help crypto agent developers understand and control agent spending through transaction intelligence, unlike wallets that only enforce limits."

> **What changed:** Draft was too narrow (sounded like an injection scanner, not an intelligence layer). "Crypto" replaces "AI" to narrow the market. "Transaction intelligence" replaces "scanning agent reasoning" to capture the full value (simulate + scan + route + audit). "Understand and control" replaces "catch" to avoid implying prevention when the cooperative model provides detection.

---

## Trust spectrum (new, added by CEO review)

Mandate's intelligence works at every trust level. Enforcement depends on your wallet:

```
WALLET PATTERN          MANDATE'S ROLE           ENFORCEMENT
---                     ---                      ---
EOA (agent holds key)   Detection + audit        Cooperative (agent calls API)
CDP/TEE managed key     Validation gate          Provider enforces signing rules
Safe multisig           Propose-only             Human signs with hardware wallet
Session keys (4337)     On-chain constraints      Trustless (contract reverts)
```

Mandate is not an alternative to session keys. Mandate installs ON TOP of any wallet and adds what session keys can't: simulation, reasoning analysis, approval routing, and rich audit context.

## Competitive context (March 2026)

The real competition is inaction: developers fund agents with $50 and hope for the best.

Every wallet provider (Coinbase, Privy, Openfort, Crossmint, Turnkey) bundles policy with their own wallet. Mandate is the only wallet-agnostic intelligence layer.

No competitor combines simulation + reasoning analysis + approval routing + audit in a single layer. They enforce policy on parameters (amount, destination, contract) but never analyze WHY the agent decided to transact.

## White space (confirmed unoccupied, March 2026)

1. Transaction intelligence combining simulation, reasoning scan, risk scoring, and approval routing
2. Wallet-agnostic policy layer (every competitor bundles wallet + policy)
3. Circuit breaker / automatic kill switch on anomaly
4. Solo-dev pricing (free, not $299/mo)

## Aspirational reference

Auth0. Non-custodial, developer-first, "just the policy layer" that never holds keys or funds. Proved thin enforcement layers are multi-billion outcomes.

Key parallel: Auth0 also had a trust spectrum (passwords < MFA < hardware keys). They didn't hide that passwords were weak. They made every level better and pushed users toward stronger options.

## Three layers (from earlier work, validated by CEO review)

| Layer | Words | Feeling |
|-------|-------|---------|
| **Sexy** | X-ray vision for agent wallets | "I want that" |
| **Trust** | The seatbelt is built in | "I need that" |
| **Technical** | Transaction intelligence for agent spending | "I understand that" |

Lead with want. Deliver need. Explain with understand.

---

## CEO Review Decisions (2026-03-26)

| # | Contradiction | Resolution |
|---|---|---|
| 1 | Core bet = reasoning intelligence, but own docs say cooperative model is bypassable | Reasoning IS the bet. It's the unique differentiator nobody else has. Session keys are commoditized. Acknowledge trust spectrum honestly. |
| 2 | Market scope = "crypto and fiat," but own docs warn "don't be Stripe + Ramp for agents" | Crypto agents only. Fiat goes to roadmap, not positioning. |
| 3 | Honest gap = "brand awareness," but deeper issue is cooperative enforcement limits | Cooperative trust gap is the real honest gap. Brand awareness is a hustle problem, not a positioning problem. |
| 4 | Statement focused on injection scanning, but docs say intelligence layer is the real product | Broadened to "transaction intelligence" (simulate + scan + route + audit). Injection scanning is one feature, not the product. |

---

*Positioning exercise conducted 2026-03-25. CEO review 2026-03-26. Builds on: positioning-seatbelt.md, positioning-intelligence-layer-why-field.md, strategic-analysis-intelligence-layer.md, ceo-review-synthesis.md, hackathon-scope-1icp-1problem.md.*
