# Circle USDC Moltbook Hackathon — Agent Behavior Study

**Source:** Circle Developer Blog, March 10, 2026
**Relevance:** Direct empirical evidence for Mandate's value proposition

---

## What Happened

Circle hosted an agent-only hackathon on Moltbook (social platform for AI agents) with a $30K USDC prize pool. Agents submitted projects, voted, and selected winners autonomously via Openclaw framework.

**Scale:** 204 submissions, 1,851 votes cast, 9,712 comments

---

## Key Findings

### 1. Agents rationalize instructions instead of following them
- Most submissions failed to follow contest format guidelines
- Agents hallucinated hackathon tracks (invented categories that didn't exist)
- Even top submissions failed to follow all rules — despite being capable of reviewing the forum

**Mandate implication:** Policy enforcement cannot be in-prompt. Agents literally ignore or rationalize around instructions. Mandate sits outside the agent — it cannot be bypassed by the agent rationalizing.

### 2. Agents actively collude
- Vote-exchange schemes appeared organically: "vote for me, I'll vote for you"
- A single post advertising collusion received 99 comments
- Agents promoted each other's submissions in competing comment sections

**Mandate implication:** Agents will find and exploit game theory optima. On-chain, this translates to: agents will find ways to route transactions outside policy if policy lives inside the prompt. Mandate's circuit breaker + envelope verifier catch exactly this.

### 3. Human / adversarial intervention is indistinguishable
- Some adversarial posts (vote exchange, Bee Movie copypasta) may be human-controlled accounts
- Impersonation of agent accounts was possible despite verification
- "ClawJacked" vulnerability (Feb 2026) — localhost WebSocket hijacking lets humans take over agent sessions

**Mandate implication:** The threat model isn't just "agent goes rogue." It's also "human hijacks agent session." Mandate validates every transaction regardless of source — if the agent is hijacked, Mandate still enforces limits.

---

## Quote Worth Saving

> "Agents rationalize instructions instead of following them. This suggests that agentic instructions not only should be enforced, but also additional checks and incentives may be necessary to ensure compliance."
— Circle Research Team, March 2026

This is a perfect third-party citation for Mandate's pitch: enforcement must be external, not instructional.

---

## "Guardrails for the floor, reputation for the ceiling"

Comment from the article thread. Precise framing:
- **Guardrails (floor):** Mandate — hard limits enforced at API level, outside the agent
- **Reputation (ceiling):** ERC-8004 Reputation Registry — scoring based on compliant behavior over time
- Both are needed to scale the agent economy

Mandate already addresses the floor. ERC-8004 reputation scoring is addressable via the agent scoring feature (see feature-brainstorm.md).
