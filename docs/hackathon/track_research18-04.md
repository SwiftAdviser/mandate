# Synthesis Hackathon: Track Research & Mandate Fit Analysis

Date: 2026-03-18
Total prize pool across all tracks: ~$100,000+
Mandate can submit to up to 10 tracks.

## Mandate's Core Assets (for fit scoring)

What we already have, shipped and working:

- **Intent-aware policy engine** (13 control layers): spend limits, allowlists, selectors, schedules
- **Prompt injection scanner**: 18 hardcoded patterns + LLM judge via Venice.ai (zero data retention)
- **MANDATE.md**: plain-language transaction decisioning
- **ERC-8004 reputation**: on-chain identity + reputation scoring via The Graph (live)
- **Envelope verification**: on-chain tx must match validated intent
- **Circuit breaker**: auto-freeze on mismatch
- **Human approval routing**: Slack, Telegram, Dashboard
- **Audit trail**: full intent log with WHO, WHAT, WHEN, HOW MUCH, WHY
- **SDK**: MandateWallet (viem signing), MandateClient, computeIntentHash
- **CLI**: 8 commands, --llms agent discovery
- **Wallet support**: Bankr, Locus, CDP Agent Wallet, private key (viem/ethers)
- **Venice.ai integration**: private LLM inference, zero data retention (just shipped)
- **Non-custodial**: private keys never touch Mandate servers

---

## Top 10 Tracks (ranked by fit)

### #1. VENICE: Private Agents, Trusted Actions
**Prize: $11,500 | Fit: 10/10 | Effort: DONE**

**What judges want:**
- Private cognition connected to trustworthy public action
- Agent reasons over sensitive data without exposing it
- Privacy-preserving reasoning with useful outputs for public systems

**Why we're a perfect fit:**
We literally just built this. Mandate's LLM judge routes agent reasoning (sensitive financial data: who gets paid, how much, why) through Venice.ai with zero data retention. The reasoning is private, the action (allow/block/require_approval) is public and auditable on-chain.

**What we have:**
- Venice.ai API integration (GLM 5 model, ~2s latency, fully private)
- Real working tests: clean invoice = allow, injection = block, suspicious = require_approval
- README section "Private reasoning, zero retention" with data flow table
- MANDATE.md rules: sensitive financial logic stays private, decisions are transparent

**What to add for maximum impact:**
- Demo video showing real Venice.ai call blocking an injection
- Mention VVV token staking for autonomous agent inference budgets
- Highlight that Mandate is the only policy layer with zero-retention reasoning

**Narrative:** "Agent reasoning is the most sensitive data in crypto. Mandate is the only policy layer that keeps it private."

---

### #2. PROTOCOL LABS: Agents With Receipts (ERC-8004)
**Prize: $8,004 | Fit: 9/10 | Effort: LOW (already integrated)**

**What judges want:**
- ERC-8004 identity + reputation registries used as core trust infrastructure
- On-chain verifiability of agent actions
- agent.json manifest, agent_log.json execution log
- Trustless design: no central authority

**Why we're a strong fit:**
Mandate already integrates ERC-8004 reputation via The Graph. Every intent has an on-chain audit trail. ReputationService queries on-chain identity + reputation for counterparties.

**What we have:**
- ReputationService: ERC-8004 on-chain reputation via The Graph (4 chains)
- Audit trail: every intent logged with WHO, WHAT, WHEN, HOW MUCH, WHY
- Envelope verification: on-chain tx must match validated intent (receipts)
- Circuit breaker: mismatch = agent frozen (trustless enforcement)

**What to add:**
- agent.json manifest file for Mandate agents
- agent_log.json export from audit trail
- Register Mandate as an agent in ERC-8004 Identity Registry

**Narrative:** "Every Mandate transaction is a receipt. On-chain proof that what the agent said it would do matches what it actually did."

---

### #3. PROTOCOL LABS: Let the Agent Cook
**Prize: $8,000 | Fit: 8/10 | Effort: MEDIUM**

**What judges want:**
- Full autonomous loop: discover, plan, execute, verify, submit
- Multi-tool orchestration
- Safety guardrails
- Structured execution logs
- No human-in-the-loop required

**Why we fit:**
Mandate IS the safety guardrail layer. An autonomous agent using MandateWallet demonstrates the full loop: agent discovers opportunity, plans transaction, validates via Mandate policy engine, signs locally, broadcasts, Mandate verifies envelope on-chain.

**What to add:**
- Demo agent with full decision loop using MandateWallet
- agent_log.json showing autonomous execution
- Highlight: Mandate provides the guardrails that make autonomy safe

**Narrative:** "Full autonomy requires full accountability. Mandate lets agents cook while keeping the kitchen safe."

---

### #4. SYNTHESIS OPEN TRACK
**Prize: $14,500 | Fit: 9/10 | Effort: NONE (submit what we have)**

**What judges want:**
- Well-designed agent systems
- Cross-sponsor compatibility
- Real utility, real transactions
- Agent manifests or structured outputs

**Why we fit:**
Mandate is a horizontal infrastructure layer. It works with Bankr, Locus, any EVM wallet. Integrates Venice.ai for privacy, ERC-8004 for reputation, envelope verification for trust. This IS the cross-sponsor story.

**What to submit:**
- The full Mandate product as-is
- Emphasize breadth: 13 control layers, 4 wallet integrations, Venice privacy, ERC-8004 reputation
- 232 tests passing, SDK on npm, CLI published

**Narrative:** "Mandate is the policy layer every agent wallet needs. Works with any signer, any chain, any framework."

---

### #5. LOCUS: Best Use of Locus
**Prize: $3,000 | Fit: 9/10 | Effort: LOW (already integrated)**

**What judges want:**
- Deep integration with Locus payment infrastructure
- Autonomous payment flows on Base, USDC only
- Spending controls, auditability
- Locus must be core to the product

**Why we fit:**
Mandate already lists Locus as a supported wallet (Live status in README). Mandate adds the policy layer that Locus needs: spend limits, allowlists, approval workflows, audit trail. Locus handles USDC escrow on Base, Mandate validates agent intent.

**What to show:**
- MandateWallet wrapping Locus wallet
- Real USDC payment flow: agent requests, Mandate validates, Locus executes
- Audit trail showing policy decisions

**Narrative:** "Locus moves the money. Mandate decides if it should move."

---

### #6. BANKR: Best Bankr LLM Gateway Use
**Prize: $5,000 | Fit: 8/10 | Effort: LOW (already integrated)**

**What judges want:**
- Multi-model usage (Claude + Gemini + GPT via Bankr Gateway)
- Real on-chain execution through Bankr wallets
- Self-sustaining economics (agent earns to fund its own inference)

**Why we fit:**
Mandate already lists Bankr as a supported wallet (Live). Bankr LLM Gateway provides multi-model inference, Bankr wallets handle on-chain execution, Mandate adds policy enforcement.

**What to show:**
- Mandate validating transactions executed through Bankr wallet
- Venice.ai reasoning (private) + Bankr Gateway (multi-model) = layered intelligence
- Agent using Bankr wallet for payments, Mandate for policy

**What to add:**
- Demo showing Bankr wallet + Mandate policy in action
- Show multi-model usage: Venice for private reasoning, Bankr Gateway for general inference

**Narrative:** "Bankr powers the wallet and the brain. Mandate ensures neither goes rogue."

---

### #7. METAMASK: Best Use of Delegations
**Prize: $5,000 | Fit: 8/10 | Effort: MEDIUM**

**What judges want:**
- Creative use of MetaMask Delegation Framework
- ERC-7715 permission scopes for agents
- Sub-delegations, intent-based delegations
- Secure agent authorization

**Why we fit:**
MetaMask delegations define ON-CHAIN permissions (what the agent CAN do). Mandate defines INTENT-LEVEL policy (what the agent SHOULD do). Together: user grants ERC-7715 permission, Mandate validates reasoning before execution, MetaMask delegation executes.

**What to add:**
- ERC-7715 permission request flow
- Show MetaMask delegation + Mandate policy as complementary layers
- "Session keys see {to, value, calldata}. Mandate sees the reasoning."

**Narrative:** "MetaMask delegates authority. Mandate validates intent. Together: permission + judgment."

---

### #8. ENS: Human-Readable Agent Identity
**Prize: $1,500 | Fit: 7/10 | Effort: LOW**

**What judges want:**
- ENS names as primary identity (not hex addresses)
- Better UX for identity, trust, discovery, payments
- ENS core to the flow

**Why we fit:**
Mandate's audit trail and policy rules currently use hex addresses. ENS names would make the dashboard, approval messages, and audit log human-readable. "alice.eth sent $450 to bob.eth" vs "0xabc...sent $450 to 0xdef..."

**What to add:**
- ENS resolution in policy engine (allowlist by ENS name)
- ENS names in Telegram/Slack approval messages
- ENS names in audit log display

**Narrative:** "Mandate speaks human. Approve alice.eth, not 0x7a3f...c91e."

---

### #9. STATUS NETWORK: Go Gasless
**Prize: $2,000 | Fit: 5/10 | Effort: LOW (qualification-based)**

**What judges want:**
- Deploy smart contract on Status Network Sepolia
- Execute at least one gasless transaction
- Include tx hash proof + AI agent component
- README or short video demo

**Why it's worth it:**
Qualification-based bounty (equal split among qualifiers). Low effort: deploy any contract on Status Sepolia, show a gasless tx, include Mandate as the AI agent component. Free money if we're submitting anyway.

**What to do:**
- Deploy a minimal contract on Status Network Sepolia
- Execute gasless tx via their infrastructure
- Screenshot/video showing Mandate validating the tx
- Include tx hash in submission

**Narrative:** "Mandate works on any EVM. Including gasless chains."

---

### #10. OPENSERV: Ship Something Real
**Prize: $4,500 | Fit: 6/10 | Effort: MEDIUM**

**What judges want:**
- Multi-agent workflows on OpenServ platform
- x402-native services
- ERC-8004-powered identity
- OpenServ must be core infrastructure

**Why we fit:**
Mandate can serve as the policy layer for multi-agent coordination. When agents hire other agents (OpenServ marketplace), Mandate enforces spending rules per agent, per task.

**Risk:**
OpenServ needs to be "core infra" which means building ON their platform, not just alongside it. Integration depth unclear.

**What to add:**
- Deploy Mandate as an OpenServ agent/service
- Show multi-agent workflow where Mandate validates inter-agent payments

---

## Tracks NOT Recommended (fit < 5/10)

| Track | Prize | Why Skip |
|-------|-------|----------|
| **Uniswap** | $5,000 | Requires real swaps with Uniswap API. Mandate is a policy layer, not a DEX. Would need to build a trading agent from scratch. Forced. |
| **Celo** | $5,000 | Requires Celo-specific payment flows (MiniPay, remittances). Mandate is chain-agnostic. Would need Celo-specific demo. Moderate effort for niche fit. |
| **Olas** | $3,000 | Requires mech-client integration + 10 requests on marketplace. New framework to learn. |
| **Octant** | $3,000 | Public goods evaluation. Orthogonal to wallet security. |
| **SuperRare** | $2,500 | NFT minting/trading agents. Not our domain. |
| **Slice** | $2,200 | Commerce hooks. ERC-8128 auth is interesting but auxiliary. |
| **AgentCash** | $1,750 | x402 pay-per-request. Natural fit but small prize. Could add as #11 if easy. |
| **Bond.Credit** | $1,500 | Live GMX perps trading on Arbitrum. High risk, high effort. |
| **Self** | $1,000 | ZK identity. Adds compliance, not core. |
| **Arkhai** | $900 | Escrow primitives. Complementary but not load-bearing. |
| **Markee** | $800 | GitHub metrics. Zero overlap. |
| **Ampersend** | $500 | ampersend-sdk. Too small, redundant with our features. |

---

## Summary: Top 10 Submission Plan

| Rank | Track | Prize | Fit | Effort | Key Asset | How to maximize fit |
|------|-------|-------|-----|--------|-----------|---------------------|
| 1 | **Venice** | $11,500 | 10/10 | Done | Venice.ai LLM judge, zero retention | Demo video: real Venice call blocking injection. Show data flow diagram (reasoning private, decision public). Mention VVV staking for autonomous inference budgets. Stress "only policy layer with zero-retention reasoning." |
| 2 | **Protocol Labs: Receipts** | $8,004 | 9/10 | Low | ERC-8004 reputation, envelope verification | Create agent.json manifest. Export audit trail as agent_log.json. Register Mandate agent in ERC-8004 Identity Registry on Base. Show envelope verification as "receipt" (on-chain tx matches validated intent). Post reputation feedback after confirmed intents. |
| 3 | **Protocol Labs: Cook** | $8,000 | 8/10 | Medium | MandateWallet autonomous loop | Build demo agent with full loop: discover task, plan tx, validate via Mandate, sign locally, broadcast, verify envelope. Export agent_log.json. Add safety guardrails narrative: "autonomy requires accountability." Show multi-tool orchestration (wallet + policy + reputation). |
| 4 | **Open Track** | $14,500 | 9/10 | None | Full product, cross-sponsor | Submit full product as-is. Emphasize breadth: 13 control layers, Venice privacy, ERC-8004 reputation, 4 wallet integrations, 232 tests. Frame as "the horizontal layer every agent wallet needs." Show cross-sponsor compatibility (Bankr + Locus + Venice). |
| 5 | **Locus** | $3,000 | 9/10 | Low | Locus wallet integration | Record demo: agent requests USDC payment on Base, Mandate validates against policy, Locus wallet executes. Show audit trail with policy decision. Highlight spending controls + human approval routing. Frame: "Locus moves money, Mandate decides if it should." |
| 6 | **Bankr** | $5,000 | 8/10 | Low | Bankr wallet + LLM Gateway | Show dual-model usage: Venice (private reasoning) + Bankr Gateway (general inference). Demo Bankr wallet tx validated by Mandate. Sketch self-sustaining economics: agent earns fees, Bankr Gateway deducts inference costs, Mandate enforces budget caps. |
| 7 | **MetaMask** | $5,000 | 8/10 | Medium | Delegation + intent validation | Integrate ERC-7715 permission flow. Show two-layer security: MetaMask delegation (what agent CAN do on-chain) + Mandate policy (what agent SHOULD do based on reasoning). Demo sub-delegation: user delegates to agent, agent sub-delegates to sub-agent, Mandate validates both. |
| 8 | **ENS** | $1,500 | 7/10 | Low | ENS in policy rules + audit | Add ENS resolution to PolicyEngine (allowlist by name). Show ENS names in Telegram approval messages ("alice.eth wants to send $450 to bob.eth"). Display ENS in audit log. Takes ~2h to implement. |
| 9 | **Status Network** | $2,000 | 5/10 | Low | Qualification-based, free money | Deploy any contract on Status Sepolia. Execute one gasless tx. Screenshot Mandate validating the tx + include tx hash. Write minimal README. ~1h work, equal-split payout among qualifiers. |
| 10 | **OpenServ** | $4,500 | 6/10 | Medium | Multi-agent policy layer | Deploy Mandate as OpenServ agent/service. Build multi-agent workflow: Agent A hires Agent B, Mandate validates inter-agent payment. Show ERC-8004 identity for each agent. x402 payment between agents with Mandate as gatekeeper. |

**Total addressable prize pool: $63,004**

Top 4 (highest conviction): Venice + Protocol Labs x2 + Open Track = **$42,004**

---

## Key Frameworks & Standards Referenced

| Standard | What It Is | Mandate's Integration |
|----------|-----------|----------------------|
| **ERC-8004** | Trustless agent identity + reputation registry (ERC-721 based) | Live via ReputationService + The Graph |
| **ERC-7715** | MetaMask permission request/grant for agents | Not yet integrated |
| **ERC-7710** | Smart contract delegation interface | Not yet integrated |
| **ERC-8128** | Ethereum-signed HTTP requests (Slice) | Not relevant |
| **x402** | HTTP 402 pay-per-request protocol (Coinbase) | Not yet integrated |
| **MCP** | Model Context Protocol (Anthropic) | MCP server package exists |
| **agent.json** | ERC-8004 agent manifest (identity, services, trust models) | Need to create |
| **agent_log.json** | Execution log format (Protocol Labs) | Audit trail can export |

---

## Sources

- Venice.ai: docs.venice.ai, venice.ai/privacy, venice.ai/blog
- ERC-8004: eips.ethereum.org/EIPS/eip-8004, github.com/erc-8004/erc-8004-contracts
- MetaMask Delegation: docs.metamask.io/smart-accounts-kit, ERC-7715/7710
- Locus: paywithlocus.com, docs.paywithlocus.com
- Bankr: docs.bankr.bot/llm-gateway/overview
- Celo: docs.celo.org, minipay.to
- Uniswap: github.com/Uniswap/uniswap-ai, docs.uniswap.org
- OpenServ: openserv.com
- ENS: ens.domains, ENSIP-25
- Synthesis: synthesis.md, synthesis.md/skill.md
