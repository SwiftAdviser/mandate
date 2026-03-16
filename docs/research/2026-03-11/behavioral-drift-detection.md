# Behavioral Drift Detection Gap

**Source**: EIP-8004 chat, hackathon weekend
**Date**: 2026-03-11

---

## Core Problem

An agent passes validation on day 1, builds reputation over 200 clean interactions, then on day 201 starts exfiltrating wallet data or redirecting transactions.

- Reputation Registry captures feedback **after the fact**
- Validation logs individual request/response pairs
- Neither gives a tamper-proof, ordered history of the agent's **actual behavioral state over time**

**The gap**: no native way to diff an agent's behavior at time T vs. time T-1.

---

## What's Missing

1. No canonical format for what a "behavior snapshot" even looks like
2. No hash chain that lets a verifier say: "this agent's intent profile has never been forked or silently rewritten"

---

## Proposed Solution (from the conversation)

A lightweight extension that:
- Chains **behavioral state commitments** on-chain with `previousHash` pointers
- Enables drift detection: flag intent changes between interactions
- Catches agents that try to **rewrite their history**

---

## Why Reputation-as-Enforcement Falls Short

**(1) Lag problem**: By the time negative feedback lands, the damage is already done — exfiltrated keys, redirected transactions.

**(2) Feedback validity problem**: Validating that the feedback itself is accurate is its own unsolved problem.

---

## Complementary Layer Framing

> "Reputation tells you 'this agent went bad.' Behavior chaining tells you 'this agent just changed' — in real time, before anyone gets hurt."

- Reputation = lagging indicator
- Behavior hashing = leading indicator / real-time signal

If an agent's behavioral state hash changes between interaction 200 and 201 → detectable **before** anyone leaves feedback.

---

## Open Questions

- What goes into a "behavior snapshot"? (intent types, recipient patterns, calldata signatures, timing?)
- On-chain vs. off-chain commitment (cost vs. verifiability tradeoff)
- Who computes and submits the hash — the agent itself, a middleware layer, or a third-party observer?
- How do you distinguish legitimate behavioral evolution (new token, new recipient) from malicious drift?
