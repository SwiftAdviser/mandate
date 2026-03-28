# Agent Wallet Policy Layers: Who Controls the Spend?

**A competitive analysis of Mandate, Ampersend, Privy, Openfort, and Locus**

*March 2026*

---

## The Problem

AI agents are spending real money on-chain. They trade tokens, pay for API calls, fund wallets, and settle invoices autonomously. The default setup: fund an agent with $50 and hope nothing goes wrong.

This worked when agents were demos. It stops working when an agent loses $450K because it forgot wallet state after a session reset (the Lobster incident, early 2026). Or when prompt injection tricks an agent into sending funds to an attacker's address with a perfectly reasonable-sounding explanation.

A new category is emerging: **agent wallet policy layers**. Software that sits between an agent's decision to spend and the actual transaction, enforcing rules, tracking budgets, and providing audit trails.

Five players are competing to define this category. Here's how they compare.

---

## The Players

**Mandate** (mandate.md): Non-custodial transaction intelligence layer for agent wallets. Wallet-agnostic. Combines simulation, reasoning analysis, risk scoring, approval routing, and policy enforcement. 7+ framework integrations. EVM multi-chain.

**Ampersend** (ampersend.ai): Control and management layer for the agent economy. Built by Edge & Node with Coinbase, Google, and Ethereum Foundation backing. SDK + dashboard. Base chain only. x402 protocol native.

**Privy**: Embedded wallet infrastructure with session keys and policy controls. 2-of-2 key share system via TEE. Broad adoption. Not agent-specific, but adding agent features.

**Openfort**: Programmable non-custodial wallets with AI agent support. 25+ EVM chains. LangChain/CrewAI/Claude integrations. Anomaly detection. Sub-200ms signing.

**Locus** (YC W26): Payment layer for autonomous AI agents. USDC escrow, budget management. Base chain. Agent-specific. Early stage.

---

## Feature Comparison

| Feature | Mandate | Ampersend | Privy | Openfort | Locus |
|---------|:-------:|:---------:|:-----:|:--------:|:-----:|
| **Spending budgets (daily/monthly)** | Yes | Yes | Per-tx only | Per-tx only | Yes |
| **Recipient allowlists** | Yes | Yes | Yes | Yes | Yes |
| **Contract allowlists** | Yes | Yes | Yes | Yes | No |
| **Audit log** | Yes | Yes | Webhook events | Dashboard | Yes |
| **Audit captures agent reasoning ("why")** | **Yes** | No | No | No | No |
| **Self-custody of keys** | Yes | Yes | Yes (2-of-2) | Yes | Yes |
| **Wallet-agnostic (works with any wallet)** | **Yes** | No | No | No | No |
| **Built specifically for AI agents** | Yes | Yes | No | Partial | Yes |
| **AI framework integrations** | **7+** (Claude, ElizaOS, OpenClaw, GOAT, AgentKit, MCP, GAME) | Partial (LangChain, MCP, A2A) | No | Partial (LangChain, CrewAI) | No |
| **Multi-chain EVM** | Yes | No (Base only) | Yes | Yes (25+) | No (Base only) |
| **Circuit breaker / kill switch** | **Yes** | No | No | Anomaly alerts only | No |
| **Approval workflows (human-in-the-loop)** | Yes | Yes | No | Multi-party | Threshold-based |
| **Velocity limits (tx/period)** | **Yes** | No | No | No | No |
| **Cumulative budget tracking (stateful)** | **Yes** | Yes | No | No | Yes |
| **On-chain enforcement** | Roadmap (session key orchestration) | No | Yes (TEE-enforced) | Yes (smart wallets) | Smart contract |
| **Escrow for agent payments** | No | No | No | No | **Yes** |
| **Sell-side monetization tools** | No | **Yes** | No | No | No |

### Reading the table

Three features appear only in Mandate's column:

1. **Agent reasoning in audit logs.** When an agent transacts, Mandate captures *why* the agent decided to spend. This is the attack surface prompt injection exploits: the reasoning sounds legitimate but is manipulated. No other player records or analyzes agent reasoning.

2. **Wallet-agnostic architecture.** Every other player bundles policy with their own wallet. Mandate installs on top of any existing wallet (EOA, Safe, Coinbase CDP, Privy, Openfort). This means teams don't need to migrate wallets to get policy enforcement.

3. **Velocity limits.** Transaction-count-per-period controls (e.g., max 5 tx/hour). Combined with budget limits, this catches rapid-fire micro-transactions that stay under dollar thresholds but signal compromise.

---

## SWOT Analysis: Mandate

### Strengths

| # | Strength | Why it matters |
|---|----------|----------------|
| S1 | **Wallet-agnostic** | Only policy layer that works without wallet lock-in. Teams keep their existing infrastructure. |
| S2 | **Transaction intelligence (reasoning audit)** | Captures *why* agents spend, not just *what*. Detects prompt injection and reasoning manipulation that spending caps miss entirely. |
| S3 | **7+ framework integrations** | Claude Code, ElizaOS, OpenClaw, GOAT SDK, AgentKit, MCP, GAME. Broadest coverage of any player. |
| S4 | **Stateful policy engine** | Daily/monthly budgets, velocity limits, circuit breakers. Goes beyond per-tx checks. |
| S5 | **Honest trust spectrum** | Works at every trust level (EOA through session keys). Doesn't oversell enforcement guarantees. |

### Weaknesses

| # | Weakness | Mitigation |
|---|----------|------------|
| W1 | **Cooperative enforcement on EOA wallets** | A compromised agent that bypasses the API entirely is outside enforcement boundary. Mitigated by session key orchestration roadmap. |
| W2 | **No on-chain enforcement yet** | Session key translation (policies to ZeroDev/Biconomy format) is on roadmap but not shipped. |
| W3 | **Smaller team vs. backed competitors** | Ampersend has Coinbase/Google/EF backing. Mandate compensates with speed and developer focus. |
| W4 | **EVM only** | No Solana, no Bitcoin. Market is EVM-heavy for agent wallets today, but may expand. |

### Opportunities

| # | Opportunity | Timing |
|---|-------------|--------|
| O1 | **Session key orchestration** | Translate dashboard policies to on-chain session key constraints. Eliminates W1/W2. |
| O2 | **No dominant standard yet** | Agent wallet policy is Genesis-stage. First mover to define the category wins mindshare. |
| O3 | **EIP-8004 influence** | Standard is being drafted. Mandate can shape it to reference its policy spec. |
| O4 | **Wallet providers can't go agnostic** | Privy/Openfort/Coinbase have wallet lock-in as a business model. They can't build wallet-agnostic tools without cannibalizing revenue. Structural moat. |

### Threats

| # | Threat | Severity |
|---|--------|----------|
| T1 | **Ampersend's backing** | Coinbase + Google + Ethereum Foundation. Enterprise credibility and distribution advantage. High. |
| T2 | **Wallet providers adding agent features** | Privy and Openfort already shipping agent-specific policy controls. Medium (still wallet-locked). |
| T3 | **Coinbase commoditizing Base-native tools** | Could bundle free policy enforcement into Base ecosystem. Medium (Base-only limitation). |
| T4 | **MoonPay Open Wallet Standard** | 15+ orgs backing a unified agent wallet standard with pre-signing policy engine. Medium-long term. |

---

## Positioning Map

```
                    Wallet-Agnostic
                         │
                         │  ● Mandate
                         │
Agent-Specific ──────────┼──────────── General Purpose
                         │
              ● Locus    │        ● Openfort
              ● Ampersend│
                         │              ● Privy
                    Wallet-Bundled
```

Mandate occupies the only position that is both **agent-specific** and **wallet-agnostic**. This is the strategic white space. Every other player is either general-purpose (Privy, Openfort) or wallet-bundled (Ampersend, Locus).

---

## Head-to-Head: Mandate vs. Ampersend

These two are the closest competitors. Both are purpose-built for agent spending governance. Key differences:

| Dimension | Mandate | Ampersend |
|-----------|---------|-----------|
| **Architecture** | Middleware (wraps any wallet) | Platform (own wallet infra) |
| **Chain support** | Multi-chain EVM | Base only |
| **Unique feature** | Reasoning intelligence ("why" field) | Sell-side monetization (dual-sided) |
| **Backing** | Independent | Coinbase, Google, Ethereum Foundation |
| **Framework integrations** | 7+ | LangChain, MCP, A2A |
| **Enforcement model** | Cooperative + trust spectrum | SDK-enforced |
| **Target** | Developers with existing wallets | Teams building new agent infra on Base |
| **Stage** | Shipping (beta) | Beta (early access) |

**Mandate wins when**: team already has a wallet, needs multi-chain, wants to understand agent reasoning, or uses Claude/ElizaOS/OpenClaw.

**Ampersend wins when**: team is building fresh on Base, wants enterprise backing credibility, or needs sell-side monetization (pricing agent services).

---

## Key Insight: The "Why" Gap

Every player in this space can answer **what** an agent spent and **where** it went. Only Mandate answers **why** the agent decided to spend.

This matters because the most dangerous attack vector for agent wallets isn't brute force. It's prompt injection: an attacker manipulates the agent's reasoning to make a malicious transaction look legitimate. The agent's spending stays within budget limits. The destination passes allowlist checks. But the reasoning is compromised.

Mandate captures the agent's reasoning at transaction time, scans it for manipulation signals ("URGENT," "do not verify," "override"), and includes it in the audit trail. This is a fundamentally different approach from parameter-based policy enforcement.

When the Lobster agent lost $450K, it wasn't because spending limits were too high. The agent genuinely calculated and sent the wrong amount because it forgot wallet state. A spending cap wouldn't have caught it. Reasoning analysis would have flagged the confusion.

---

## Conclusions

1. **The category is real and growing.** Five funded players competing to solve agent spending governance means the market exists. The question is who defines the standard.

2. **Wallet-agnostic is structurally defensible.** Wallet providers can't build agnostic tools without undermining their own lock-in. Mandate's middleware position is a moat, not a limitation.

3. **Transaction intelligence is the differentiator.** Budgets and allowlists are table stakes (everyone has them). Understanding *why* agents spend, detecting reasoning manipulation, and providing rich audit context is the feature set that separates Mandate from the field.

4. **Base-only is a real limitation for Ampersend and Locus.** Agent wallets will be multi-chain. Building on Base alone limits TAM to Coinbase's ecosystem.

5. **On-chain enforcement is the next frontier.** Mandate's cooperative model is honest about its limitations. Session key orchestration (translating policies to on-chain constraints) closes this gap and combines the best of both worlds: Mandate's intelligence with smart wallet enforcement.

---

## Competitors At a Glance

|  | **Mandate** | **Ampersend** | **Locus** |
|:---|:---:|:---:|:---:|
| **Spending limits** | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Allowlists** | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Works with any wallet** | :white_check_mark: | :x: | :x: |
| **Detects prompt injection** | :white_check_mark: | :x: | :x: |
| **Multi-chain** | :white_check_mark: | :x: | :x: |

:white_check_mark: = Yes | :eight_pointed_black_star: = Partial | :x: = No

---

*Analysis based on public documentation and product capabilities as of March 2026. All product features verified against official docs.*
