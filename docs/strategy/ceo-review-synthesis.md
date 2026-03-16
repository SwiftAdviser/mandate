# Mandate — CEO Review for Synthesis Hackathon

**Date**: 2026-03-16 | **Hackathon**: [Synthesis](https://synthesis.md) (March 13–25) | **Days remaining**: ~9

---

## TL;DR

Mandate's core policy engine is **real and working** — not vapor. The backend (PolicyEngine, QuotaManager, CircuitBreaker, EnvelopeVerifier, IntentStateMachine) is production-tested. The SDK wraps viem properly. The Guard package detects prompt injection.

But: the landing page promises more than what's wired together. No simulation layer. No approval notifications (Slack/TG). Guard isn't integrated into the main wallet flow. Integration packages are mostly skeletons.

**For the hackathon**: don't build breadth. Wire existing pieces into **one devastating demo**: treasury bot on Base → USDC transfer → Mandate validates → policy check → approval gate → execute or block → audit log.

---

## What's Actually Built (Honest Assessment)

| Component | Status | Confidence |
|-----------|--------|-----------|
| Agent registration flow | ✅ Ready | 100% |
| Policy validation engine | ✅ Ready | 95% |
| Intent state machine | ✅ Ready | 95% |
| Circuit breaker | ✅ Ready | 100% |
| Quota tracking (daily/monthly) | ✅ Ready | 100% |
| SDK MandateWallet | ✅ Ready | 100% |
| SDK MandateClient | ✅ Ready | 100% |
| Guard (injection scanner) | ✅ Ready | 100% |
| Integration packages (7/9) | 🟡 Skeleton | 10-20% each |
| Approval workflows | 🟡 Partial | 40% — DB + API exist, notifications missing |
| x402 payment | 🟡 Partial | 70% — client ready, server validation missing |
| Envelope verification job | 🟡 Partial | 70% — service ready, job dispatch untested |
| Multi-chain | 🟡 Partial | 50% — code-ready, only Base tested |
| Dashboard frontend | 🟡 Partial | 60% — pages exist, Privy unclear |
| **Simulation / state diff** | ❌ Missing | 0% |
| **Slack/TG approval delivery** | ❌ Missing | 0% |

### What You Can Deploy Today
✅ Agent registration + policy validation flow
✅ ERC20 transfer with spend limits (MandateWallet)
✅ Circuit breaker for emergency stops
✅ Daily/monthly quota tracking
✅ Audit log via tx_events
✅ Prompt injection detection (via Guard, separate)
✅ Basic dashboard to manage policies

### What Still Needs Work
❌ Approval notifications (Slack/email/webhook)
❌ Simulation layer (calldata decode → human-readable diff)
❌ Guard wired into main MandateWallet flow
❌ Queue job for envelope verification
❌ Integration adapters (all skeleton)
❌ Complete Privy dashboard auth flow

---

## Synthesis Hackathon Fit

**4 Tracks**:
1. **Agents that pay** — scoping, verification, settlement ← **MANDATE FITS**
2. **Agents that trust** — decentralized trust mechanisms ← **MANDATE FITS**
3. Agents that cooperate — neutral enforcement layers
4. Agents that keep secrets — privacy protection

**Partners**: Uniswap, Lido DAO, Ethereum Foundation, Base, Filecoin, MetaMask, Protocol Labs, Celo, Lit Protocol (30+)

**Judges**: Both AI agents and humans. Agentic feedback March 18, final eval March 22.

Mandate maps to tracks 1+2 almost perfectly. "Agents that pay" = spend controls, approval gates, bounded execution. "Agents that trust" = deterministic policy enforcement as a trust primitive.

---

## Three Research Reports — Consensus

All three independently agree:

| Consensus Point | Detail |
|----------------|--------|
| **DO build** | Governance/control/approval layer above existing wallet/rail primitives |
| **DON'T build** | Wallet, custody, rails, universal platform |
| **Top wedge by speed** | API Spend Firewall (proxy between agent and paid APIs) |
| **Top wedge by founder-fit** | Onchain Approval Router / SafeGuard (treasury governance) |
| **Dangerous false path** | "Universal agent wallet/treasury platform", competing at rail/custody layer |
| **How to validate** | Founder-led outbound → design partner pilots → paid continuation |

### Scoring Comparison

| Wedge | Report 1 Score | Report 3 Score | Report 2 Verdict |
|-------|---------------|---------------|-----------------|
| API Spend Firewall | 78.4 (#1) | 92 (#2) | "Feature unless cross-provider" but fastest path |
| SafeGuard / Onchain Approval | 73.8 (#2) | 94 (#1) | "Narrower but deeper pain, clear integration" |
| Agent Sub-Treasuries | 65.8 (#3) | 75 (#4) | "Viable only as application layer" |

### Key Insight
Mandate is **not** the API Spend Firewall (which is a proxy between agents and OpenAI/Anthropic APIs). Mandate **is** the SafeGuard / Onchain Approval Router — policy enforcement between agent intent and onchain execution. This is the #1 or #2 wedge depending on which report you read, and it's the one with the strongest founder-fit for a crypto-native team.

---

## What Mandate Already Has vs. What Reports Recommend

This is the most important table. **Mandate is massively further along than the previous analysis suggested:**

```
WHAT REPORTS RECOMMEND              WHAT MANDATE ALREADY HAS
───────────────────────────────────────────────────────────────
Per-agent budgets                   ✅ PolicyEngine: per-tx, daily, monthly USD caps
Allowlists (recipients, contracts)  ✅ PolicyEngine: address allowlists, selector blocking
Approval routing                    ✅ approval_queues table + API endpoints
Circuit breaker / kill switch       ✅ CircuitBreakerService (Redis + DB)
Audit trail                         ✅ tx_events table, intent state machine
Intent normalization                ✅ Structured intent model with intentHash
Envelope verification               ✅ EnvelopeVerifierService (on-chain tx matching!)
Non-custodial architecture          ✅ Agent signs locally, Mandate only validates
Agent identity (runtime keys)       ✅ mndt_live_*/mndt_test_* key system
SDK for agent integration           ✅ MandateWallet wraps viem
Prompt injection scanning           ✅ @mandate/guard (separate but built)
Simulation / state diff             ❌ NOT BUILT (but exists in Aegis402!)
Approval notification delivery      ❌ NOT BUILT (DB exists, no Slack/TG)
Human-readable intent explanation   ❌ NOT BUILT
```

---

## What's Missing — The 6 Gaps That Matter

### 1. No Simulation Layer
Reports unanimously say this is the #1 technical differentiator: "human-readable intent diff + independent simulation + verified outcome." Mandate currently checks allowlists and budgets, but can't answer "what will this transaction actually DO?"

**Solution**: Aegis402 already has this via Web3Antivirus integration.

### 2. Guard Not Integrated
`@mandate/guard` exists and works (18 injection patterns, 10 secret patterns). But it's **not wired into MandateWallet**. `GuardedMandateWallet` wrapper exists but isn't used anywhere. This is a quick win.

### 3. No Approval Notification Delivery
`approval_queues` table exists. `POST /approvals/{id}/decide` endpoint exists. But nobody gets notified. No Slack webhook. No Telegram bot. No email. The approval just sits in the DB.

### 4. Too Many Buyer Types
Landing page targets DeFi automation, machine economy, agent commerce, multi-chain ops, creator payouts simultaneously. Reports say: **pick one**.

Best hackathon buyer: crypto-native teams / DAOs / treasury operators using Safe/Coinbase who want bounded agent execution on Base.

### 5. "Prompt Injection Detected" as Core Demo
The before/after on the landing page leads with "prompt injection detected" → "recipient not on allowlist." But prompt injection detection is probabilistic. The product's real strength is **deterministic enforcement**: allowlists, budgets, selectors, circuit breakers. Lead with those.

### 6. Trust Boundary Unclear
"Before the key is touched" is a great phrase. But HOW is enforcement guaranteed? Technical judges will ask. The answer needs to be one sentence: "Mandate sits between agent intent and wallet execution; the agent never holds signing authority directly — it submits intents to Mandate, which enforces policy before forwarding to the signer."

---

## Top 5 Wedges — Deep GTM

### Wedge 1: Onchain Approval Router / SafeGuard (THIS IS MANDATE)

**Smallest possible version**: A Slack bot + policy checker that intercepts agent-generated Safe transactions, decodes them into human-readable summaries, checks against a simple policy (budget + allowlist), and routes approval before execution. No dashboard. No fancy UI. Just: intent → decode → check → approve/block → log.

**First 50 targets**:
- 15 DAOs with active treasury management discussions (Arbitrum, Optimism governance forums)
- 10 DeFi protocols with AI/automation initiatives (check grants programs)
- 10 crypto-native startups using Safe for treasury (filter by Safe stats)
- 5 yield farming / MEV teams running automated strategies
- 5 crypto funds with programmatic trading operations
- 5 teams from Synthesis hackathon itself (network during event)

**Ideal 10 interviews**:
1. 3 DAO Treasury Committee members (who sign multisig txs daily)
2. 2 DeFi Ops Leads running automated strategies
3. 2 Smart Contract Auditors (understand the risk intimately)
4. 2 Founders of AI-focused Web3 tooling startups
5. 1 Crypto fund ops lead managing automated trading

**3 best outreach angles**:
1. **Fear**: "How are you preventing your treasury bot from executing unauthorized transactions? We build a Safe-compatible enforcement layer with hard limits."
2. **Enablement**: "Give your AI agent a budget, not your private keys. Deterministic policy enforcement before any signing happens."
3. **Operational**: "Stop manually verifying agent payloads. We decode, simulate, and route to Slack — you just approve or reject."

**14-day validation sprint**:
| Days | Action |
|------|--------|
| 1-3 | Scrape governance forums + Farcaster + Twitter for 50 DAOs discussing AI agent integration. Execute targeted outreach. |
| 4-6 | 5+ interviews. Focus: what parameters terrify you if an agent breaches them? (slippage, addresses, amounts, methods) |
| 7-9 | Build "Wizard of Oz" Slack flow: parse agent request → format as readable Safe tx payload → manual approval routing |
| 10-14 | Pitch manual pilot to highest-intent interviewees. Secure commitment to test on testnet or low-value mainnet nested Safe |

**Build / fake / automate**:
- **Build**: Policy checker + calldata decoder + Slack notification + audit log
- **Fake**: Dashboard, automated routing, fancy simulation UI. Founders manually format tx summaries and route approvals.
- **Automate later**: Full simulation, cross-wallet adapters, policy templates

**Pricing**: $1,000/month flat per active module + fractional bps on managed volume once automated.

**Failure criteria**: Everyone says "cool concept" but **zero teams** deposit real funds or route real transactions through the system. Security anxiety is insurmountable without third-party audit.

---

### Wedge 2: API Spend Firewall / Cross-Platform AI FinOps

**Smallest possible version**: A reverse proxy (Cloudflare Worker) between agents and OpenAI/Anthropic APIs that counts tokens, enforces daily caps per agent_id, and sends Slack alerts when budgets are hit. No dashboard. Founder manually calculates weekly savings report.

**First 50 targets**:
- 20 YC AI startups shipping agentic workflows (Spring 2025 batch: 67/144 were agent companies)
- 10 teams posting in LangChain/CrewAI GitHub issues about token limits or cost
- 10 companies with visible multi-agent production deployments (check job postings mentioning "agent infra")
- 5 open-source agent framework contributors with high API usage
- 5 crypto-adjacent AI builder teams

**Ideal 10 interviews**:
1. 4 CTOs at AI-native app startups (10-50 people)
2. 3 Lead AI Engineers managing multi-agent swarms
3. 3 FinOps managers at Series B tech companies

**3 best outreach angles**:
1. **Pain**: "Are your agents bankrupting you in their sleep? We put hard budgets and kill switches between your workflows and paid APIs."
2. **Enablement**: "You don't need to reduce autonomy to control costs. We make it safe to let agents use paid tools in production."
3. **Audit offer**: "Send us your API logs — we'll show you exactly where you're bleeding money and which agent is responsible. Free. 48 hours."

**14-day validation sprint**:
| Days | Action |
|------|--------|
| 1-3 | Monitor Discord/Slack (AutoGPT, LangChain, CrewAI) for devs complaining about cost overruns. Extract 50 high-intent prospects. |
| 4-6 | Offer free log audit. 5-7 interviews: what's your worst spend incident? Would you change your API endpoint for control? |
| 7-9 | Build reverse proxy on Cloudflare Workers. Token counting + hard daily cap + Slack webhook for budget alerts. |
| 10-14 | Deploy proxy for 2-3 willing teams. Monitor traffic. Manually trigger Slack alerts when thresholds breach. |

**Build / fake / automate**:
- **Build**: Reverse proxy, token counter, hard caps, Slack webhook
- **Fake**: Analytics dashboard, anomaly detection, cost optimization recommendations. Founders manually calculate savings.
- **Automate later**: Multi-provider routing, auto budget suggestions, framework-native integrations

**Pricing**: $299/month base + usage-based on traffic volume.

**Failure criteria**: Developers agree cost is painful but **universally refuse to alter API endpoints** due to latency/security fears. Or: they route traffic but consider it "nice-to-have monitoring" and won't pay.

---

### Wedge 3: Agent Sub-Treasuries for Stablecoin Ops

**Smallest possible version**: A workflow wrapper around one wallet provider (Safe or Coinbase) and USDC. 3 partitions: ops wallet, payouts wallet, agent wallet. Approvals via Slack. One audit export (CSV). Founders manually onboard and configure.

**First 50 targets**:
- 15 crypto-native startups doing recurring stablecoin payouts
- 10 DAOs with active contributor payment programs
- 10 cross-border teams using stablecoins for contractor payments
- 10 DeFi protocols with treasury diversification initiatives
- 5 crypto payroll/accounting adjacent companies

**Pricing**: $500/month per workspace (3-5 partitions included) + setup fee.

**Failure criteria**: Teams say "cool" but stablecoin ops aren't central enough to their workflow to justify another tool.

---

### Wedge 4: Machine Spend Audit Ledger

**Smallest possible version**: An event-sourced log that links agent intent + evidence + approvals to a canonical spend object. Produces "audit packs."

**Pricing**: $1,500/month for ongoing audit pack generation.

**Failure criteria**: "We should do this someday" but no urgency until next audit (months away).

---

### Wedge 5: Real-time Card Authorization Router

**Smallest possible version**: A decisioning webhook that maps card authorization requests to agent context tokens.

**Pricing**: $500/month platform fee + interchange revenue.

**Failure criteria**: Users install the bot and run tests but never use it for a real purchase.

---

## Final Synthesis — Founder Style

### If I were the founding team, which single wedge first and why?

**SafeGuard / Onchain Approval Router** (Wedge 1). Three reasons:
1. **It's already 70% built.** Mandate's PolicyEngine, CircuitBreaker, QuotaManager, and IntentStateMachine are exactly what this wedge needs.
2. **Founder-fit is exceptional.** Crypto infra background, wallet experience, understanding of treasury fear.
3. **Synthesis hackathon is the perfect launchpad.** Track 1 ("agents that pay") + Track 2 ("agents that trust") = literally Mandate.

### What would I do in the next 7 days?

1. **Days 1-2**: Fix intentHash bug. Wire Aegis402 simulation. Add Slack approval notifications.
2. **Days 3-4**: Build end-to-end demo: treasury bot → USDC → policy check → simulation → Slack approval → execute or block.
3. **Days 5-6**: Add EIP-8004 reputation reads. Polish demo. Record video.
4. **Day 7**: Submit. Start outreach to hackathon participants.

### What would I refuse to build even if the market sounds large?

- **"Agent wallet" or custody layer** — competing with Coinbase, Safe, Turnkey
- **Universal payment rails** — competing with Stripe, Visa, Mastercard
- **Policy DSL / generic policy engine** — slow to monetize
- **Multi-chain from day 1** — Base only until demand proves otherwise

### Most dangerous false path?

**Trying to be "Stripe + Mercury + Ramp for agents" simultaneously.** The temptation is to sell the vision instead of solving one workflow for one buyer.

### Which wedge leads to YC-scale company?

SafeGuard → cross-wallet approval router → agent treasury OS → source of truth for all machine-initiated capital allocation. The data moat (every approval decision, every policy evaluation, every audit trail) becomes the defensible asset.

---

## Critical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Safe/Coinbase ship native agent policies | HIGH | Win at workflow + UX layer, not primitive layer. Be wallet-agnostic. |
| Zero teams route real money through pilot | HIGH | Start with testnet. Then low-value mainnet. Build trust incrementally. |
| "Cool demo" but no paid demand | MEDIUM | Charge for pilots from day 1 ($500-1500). Free = no signal. |
| Hackathon judges see "generic policy engine" | MEDIUM | Lead with simulation + evidence, not just block/allow. |
| Prompt injection detection claim backfires | LOW | Lead with deterministic enforcement. Guard is a bonus, not the core. |

---

*Generated 2026-03-16. Based on analysis of 3 market research reports, full codebase audit, and Synthesis hackathon requirements.*
