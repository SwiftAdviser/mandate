# Dynamic Capabilities — Mandate Strategy

Framework: Teece, Pisano & Shuen (1997)
Updated: March 2026 — with competitive landscape analysis

---

## Core Definition

Dynamic capabilities = the firm's ability to **integrate, build, and reconfigure** internal and external competences to address rapidly changing environments.

This framework is particularly relevant for Mandate because:
- The agent market is moving fast (new frameworks every quarter)
- The threat landscape is evolving (new attack vectors, new spending patterns)
- The competitive landscape is forming in real time — wrong bets now lock you in the wrong position

---

## 1. Sensing

*Perceiving and interpreting opportunities and threats before they become obvious.*

### What Mandate has already sensed (validated by competitor research)

**Opportunity: the spend governance gap — confirmed, but more precisely defined**

After scanning 8 competitor categories including Openfort and Privy (wallet policy docs read in full), the picture is more nuanced than initially assessed:

- **Openfort**: has address allowlists, ABI calldata controls, per-tx value caps, multi-chain — sophisticated, but locked to Openfort wallets and stateless (per-tx only)
- **Privy**: has approved destinations, transaction limits, contract controls — also locked and stateless
- **Coinbase**: session caps + KYT only, Base-only

**The confirmed gap** (no competitor): wallet-agnostic + **stateful** cumulative budgets + velocity limits + circuit breakers + framework integrations. These 5 capabilities remain unoccupied by any player.

The Reddit research signals have been confirmed by the 2026 competitive landscape:
- Builders searching for "AI agent spending limits" and "AI agent approval flow" — real demand
- Coinbase shipped partial controls (session caps only) — gap confirmed at policy depth level
- Zenity is Fortune Cyber 60 but enterprise-only — gap confirmed at developer accessibility level
- Leash and Microsoft toolkit address containment, not spend — gap confirmed at category level

**Threat signals sensed — re-ranked after full wallet scan:**

| Threat | Severity | Timeline | Notes |
|---|---|---|---|
| Openfort ships daily/cumulative budget tracking | **Critical** | 1–3 sprints | They have everything else; this is one feature away |
| Privy ships velocity limits | **Critical** | 1–3 sprints | Same situation as Openfort |
| Coinbase adds multi-chain + address allowlists | High | 2–4 quarters | Org complexity slows them |
| Microsoft productizes governance toolkit with spend primitives | High | 12–24 months | Big org, slow |
| Zenity launches developer SDK | Medium | 6–12 months | Different buyer |
| Arcade expands from auth into spend governance | Low-medium | 12+ months | Different domain |

**The corrected key threat**: it's NOT Coinbase adding allowlists. It's **Openfort or Privy adding cumulative budget tracking** — they already have all the other infrastructure in place. One API endpoint away from closing Mandate's core gap.

**The key insight from sensing:** Mandate's window is measured in sprints, not years, before the Coinbase threat specifically narrows. Vendor allowlists are the next logical feature for Agentic Wallet. Mandate must have design partners locked in before that ships.

### Sensing infrastructure to build and maintain

- Watch Coinbase CDP changelog weekly (GitHub, blog, dev Discord)
- Monitor r/AI_Agents and ElizaOS / AgentKit Discord for "spending limits" mentions
- Track OWASP Agentic Top 10 updates and EIP-8004/8183 progress
- Review Zenity and StrongDM release notes monthly
- Maintain a threat model for agent-initiated spend (flagged in research, not yet built)

---

## 2. Seizing

*Mobilizing resources to address the identified opportunity while capturing value.*

### The seizing move: lock in wallet-agnostic spend governance before Coinbase closes the gap

The opportunity window is open but Coinbase is the timer. Seize by:

**1. Design partner lock-in on non-Base chains (immediate)**
These teams cannot use Coinbase Agentic Wallet. They have no alternative. Sign 3–5 design partners on Ethereum, ARC, StarkNet in the next 60 days.

**2. Wrap Coinbase wallet with Mandate policy (strategic judo)**
Position Mandate as the policy layer *above* Coinbase Agentic Wallet — not instead of it. Coinbase adds session caps; Mandate adds vendor allowlists, anomaly detection, audit replay. Even Coinbase users need Mandate. This neutralizes the "Coinbase already does this" objection.

**3. Ship vendor allowlists and velocity limits before Coinbase does**
This is the specific capability gap. Ship it now.

**4. EIP-8004 / EIP-8183 standards participation**
Being in the room when the protocol-level policy primitives are defined is the highest-leverage seizing move. Reference implementations that ship first tend to become the standard. Mandate should be the reference implementation.

**Resource allocation for seizing phase:**

| Priority | Action | Owner |
|---|---|---|
| 1 | Ship vendor allowlists + velocity limits | Technical founder |
| 2 | Close 3 design partners on non-Base chains | BD founder |
| 3 | Ship circuit breakers (kill switch) | Technical founder |
| 4 | Publish Mandate Policy Spec as open draft | Both |
| 5 | Join EIP-8004 / 8183 conversation | Both |

**Value capture mechanism — options:**

| Model | Pros | Cons |
|---|---|---|
| Per-agent per-month SaaS | Predictable, simple | Hard to price pre-traction |
| Per-dollar-governed basis points | Aligns with value delivered | Complex, trust-dependent |
| Policy management SaaS + open source SDK | Successful infra playbook (Grafana, HCP) | Free tier attracts enterprise competitors |
| Design partner retainer ($X/month) | Revenue before product is complete | Must deliver fast |

Recommended: design partner retainer → per-agent SaaS → consider open-source SDK with managed service after 10 paying customers.

---

## 3. Transforming

*Continuously reconfiguring assets and structure to maintain competitive fitness.*

### Stage 1 → Stage 2 → Stage 3

**Stage 1 — Developer spend governance tool (now)**

Target: teams building agents with crypto spending authority on non-Base chains.

Product: `MandateWallet` SDK wraps any wallet with policy enforcement. Vendor allowlists, budget caps, velocity limits, circuit breakers. Policy expressed in code.

Competitive position: only wallet-agnostic spend governance SDK in the market.

Success gate: 10 teams using Mandate in staging or production.

**Stage 2 — Cross-layer spend governance platform (6–18 months)**

Target: growth-stage companies deploying multiple agents with different policy profiles.

Product adds:
- Anomaly detection (ML-based threshold learning)
- Operator dashboard for non-developer policy management
- Multi-agent policy management (different rules per agent role)
- Audit log with incident replay
- Coinbase Agentic Wallet integration (policy layer above CDP)
- SaaS API for real-time policy checks (sub-50ms, competes with WorkOS FGA on latency)

Competitive position: the governance layer that sits above all wallet providers and complements Zenity/Leash/Microsoft for the spend dimension.

Success gate: 3+ paying customers, 80%+ retention after 6 months.

**Stage 3 — Agent commerce trust layer (18–36 months)**

Target: agent marketplaces, enterprise agentic workflows, multi-agent networks.

Product adds:
- Proof of completion infrastructure
- Escrow and dispute handling for agent-to-agent transactions
- Reputation layer for agent service providers
- Compliance-as-a-service (AI governance regulations, SOC 2 for agent spend)

Competitive position: the trust and settlement standard for agent commerce — what Stripe is to human payments.

Success gate: 1 agent marketplace running settlement through Mandate.

---

### Organizational Reconfiguration

| Stage | Key Hire | Trigger |
|---|---|---|
| 1 → 2 | First PM + backend engineer | 5 paying design partners |
| 2 → 3 | BD lead + legal counsel | $500K ARR + 1 marketplace partner |

### The Transformation Discipline

Do not move to Stage 2 until Stage 1 has 10 paying design partners.
Do not move to Stage 3 until Stage 2 has 80%+ retention.

**Why this discipline matters in the current competitive context:**
Zenity tried to be everything (detection + governance + monitoring) from day one — their complexity made them enterprise-only. Leash tried to be universal (OS-level containment) — their complexity reduced adoption among the builders who feel the pain most. Mandate wins by being deep on spend governance first, broad later.

---

## Dynamic Capabilities vs. Ordinary Capabilities

**Ordinary capabilities** (build and maintain):
- Ship integrations on schedule
- Onboard design partners efficiently
- Write clean policy DSL documentation

**Dynamic capabilities** (protect with dedicated time):
- Sensing: scan competitor changelogs, EIP drafts, Reddit sentiment
- Seizing: decide which framework to integrate next based on community signals
- Transforming: recognize when Stage 1 → Stage 2 transition is ready

**Commitment:** One sensing sprint per quarter — dedicated time to scan builder communities, competitor releases, and protocol developments, with no feature work.

---

## Competitive Dynamic Capabilities Assessment

| Competitor | Sensing | Seizing | Transforming |
|---|---|---|---|
| Coinbase | Strong (market data) | Strong (distribution) | Slow (large org) |
| StrongDM Leash | Medium (open source feedback) | Medium | Slow (open source) |
| Microsoft toolkit | Weak (research-driven) | Slow (open source) | Very slow (Microsoft) |
| Arcade | Medium | Medium | Medium |
| Zenity | Strong (enterprise signals) | Strong (CISO sales) | Medium |
| **Mandate** | **Strong (Reddit + EIP)** | **Fast (small team)** | **Flexible (early)** |

Mandate's dynamic capability advantage is **speed of sensing and seizing**. A startup that reads the Reddit threads and ships vendor allowlists in two weeks beats a Coinbase team that takes two quarters to get a feature through product review.

---

Sources:
- [David Teece — Dynamic Capabilities](https://www.davidjteece.com/dynamic-capabilities/)
- [Coinbase Agentic Wallets](https://www.coinbase.com/developer-platform/discover/launches/agentic-wallets)
- [Gravitee 2026 AI Agent Security Report](https://www.gravitee.io/blog/state-of-ai-agent-security-2026-report-when-adoption-outpaces-control)
- [SWOT analysis](./swot-competitive.md)
