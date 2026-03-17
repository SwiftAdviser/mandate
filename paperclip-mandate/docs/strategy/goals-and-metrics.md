# Goals and Metrics Tree

_Last updated: 2026-03-11. Owner: CEO._

---

## Mission

**Give Agents Money to Transact Safely**

AI agents need wallets to act. But unconstrained agent spending is a liability — for users and protocols alike. Mandate is the policy enforcement layer that makes agent wallets safe: non-custodial, programmable limits, human-in-the-loop approval flows, and on-chain verification of every transaction.

---

## L0 — Company Goal

| Goal | Description |
|------|-------------|
| **Give Agents Money to Transact Safely** | The foundational bet: AI agents will transact on-chain at scale. Mandate is the safety layer that makes that possible without exposing users to unconstrained risk. |

---

## L1 — Strategic Goals

### 1. Developer Adoption
> Become the default wallet policy layer for AI agent developers.

| Metric | Target |
|--------|--------|
| Weekly SDK downloads/installs | >100/week within 4 weeks of stable release |
| # active integrations (≥1 validated tx in 30 days) | 20 within 60 days |
| Time-to-first-transaction (new user, p75) | <5 minutes |
| # supported frameworks | 8 at launch (ElizaOS, AgentKit, GOAT, MCP, claude-code-hook, ACP, GAME, OpenClaw) |

---

### 2. Policy Effectiveness
> Policies correctly block dangerous spend and allow safe spend.

| Metric | Target |
|--------|--------|
| % of validated txs covered by ≥1 policy rule | >95% for non-test integrations |
| False positive rate (legit txs blocked) | <1% |
| False negative rate (dangerous txs allowed) | 0% (must be zero) |
| Circuit breaker trips auto-resolved without human action | >80% |

---

### 3. Security and Non-Custody
> Private keys never touch Mandate. Every broadcast is verified against what was validated.

| Metric | Target |
|--------|--------|
| Private key exposures | 0 (binary; any exposure is a severity-1 incident) |
| Envelope verification coverage | 100% of broadcasted txs |
| Security incidents per quarter | 0 critical, <2 minor |
| External security audit | Completed before public launch; 0 open critical/high findings |

---

### 4. Revenue and Growth
> Build sustainable business on agent wallet infrastructure.

| Metric | Target |
|--------|--------|
| MRR | $1k within 90 days of pricing launch |
| # paying teams | 10 within 90 days |
| Validated transaction volume | Track weekly; grow 20%+ MoM |
| Team churn rate | <5%/month |

---

## L2 — Tactical Goals

### Under Developer Adoption

| Goal | Key Result |
|------|------------|
| **SDK v1.0 Stable Release with All Integration Packages** | `@mandate/sdk` + 8 plugins shipped, tested, documented; >100 downloads/week within 4 weeks |
| **Documentation: <5 Minutes to First Validated Transaction** | Quickstart ≤3 steps; p75 completion <5 min in user test |
| **5 Public Integrations in the Wild** | 5 verified open-source AI agents using Mandate in production within 8 weeks of stable release |

### Under Policy Effectiveness

| Goal | Key Result |
|------|------------|
| **PolicyBuilder UI: Non-Technical Policy Creation** | 80% of beta users create first policy without docs |
| **Approval Workflow with Human-in-the-Loop Notifications** | p50 approval response time <2 minutes; mobile-accessible |

### Under Security and Non-Custody

| Goal | Key Result |
|------|------------|
| **Envelope Verifier: Full EVM Transaction Type Coverage** | 100% tx type coverage; 0 false negatives on mismatch detection |
| **External Security Audit** | Audit complete; all critical/high findings resolved before public launch |

### Under Revenue and Growth

| Goal | Key Result |
|------|------------|
| **Pricing and Self-Serve Upgrade Flow** | First paid conversion within 2 weeks of pricing page launch |
| **First 10 Paying Teams** | 10 teams, combined MRR >$1,000 |

---

## Priority Order (Current Focus)

1. **SDK v1.0 stable** — unblocks everything downstream
2. **Documentation** — conversion depends on it
3. **Security audit** — required before enterprise conversations
4. **Pricing + 10 paying teams** — validates the business model

---

## What We Are Not Doing (Yet)

- Consumer wallet UI (not our market)
- Native custody / key management (non-custodial is a feature, not a gap)
- Multi-chain policy routing (EVM-first; expand after traction)
- Governance / DAO tooling (separate product surface)
