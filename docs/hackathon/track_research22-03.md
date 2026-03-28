# Synthesis Hackathon: Track Research & Mandate Fit Analysis (Updated)

**Date**: 2026-03-22
**Total tracks**: 46
**Total prize pool**: $134,284
**Mandate can submit to up to 10 tracks** (excluding Open Track which doesn't count toward limit)

---

## Changes Since March 18

### New tracks added
| Track | Sponsor | Prize | Mandate fit |
|-------|---------|-------|-------------|
| **Autonomous Trading Agent** | Base | $5,000 | LOW. Requires proven profitability in trading. |
| **Agent Services on Base** | Base | $5,000 | MEDIUM. x402 service discovery on Base. |
| **Best Use of EigenCompute** | EigenCloud | $5,000 | LOW. Docker on TEE, not our stack. |
| **OpenWallet Standard** | MoonPay | $3,500 | HIGH. OWS has policy types. Mandate IS policy. |
| **MoonPay CLI Agents** | MoonPay | $3,500 | MEDIUM. MCP server for swaps/DCA. Mandate validates. |
| **Best Use Case with Agentic Storage** | Filecoin | $2,000 | LOW. Storage, not payments. |
| **Student Founder's Bet** | College.xyz | $2,500 | N/A. Students only. |
| **Dark Knowledge Skills** | Workgraph | $250 | LOW. Lit Protocol TEE skills. |

### Prize changes
| Track | Old | New |
|-------|-----|-----|
| **Synthesis Open Track** | $14,500 | **$28,134** (community-funded, growing) |
| **Let the Agent Cook** | $8,000 | **$4,000** (reduced) |
| **Agents With Receipts** | $8,004 | **$4,000** (reduced) |
| **Bond.credit** | still $1,500 but requires live GMX perps trading |

---

## Evaluation Criteria (priority order)

1. **Fit score** (0-10): how naturally does Mandate solve what judges want?
2. **Effort**: DONE (ship as-is), LOW (<4h), MEDIUM (1-2 days), HIGH (3+ days)
3. **Prize pool**: total available USD
4. **Competition density**: how many teams likely target this track?
5. **Narrative clarity**: can we tell a clear story in 2 sentences?

---

## Top 10 Tracks (Recommended)

### #1. Synthesis Open Track
**Prize: $28,134 | Fit: 10/10 | Effort: DONE**
**UUID**: `fdb76d08812b43f6a5f454744b66f590`

Community-funded, biggest pool, keeps growing. No specific requirements, judges evaluate overall quality. Mandate is a complete product: 13 control layers, 304 tests, live dashboard, Venice.ai privacy, ERC-8004 reputation, SDK + CLI on npm.

**Narrative**: "The horizontal policy layer every agent wallet needs. Works with any signer, any chain, any framework."

---

### #2. Private Agents, Trusted Actions (Venice)
**Prize: $11,500 | Fit: 10/10 | Effort: DONE**
**UUID**: `ea3b366947c54689bd82ae80bf9f3310`

**What judges want**: Private cognition connected to trustworthy public action. Agent reasons over sensitive data without exposure.

**Why we're perfect**: Mandate's LLM judge routes agent reasoning through Venice.ai with zero data retention. Reasoning is private, decisions are public and auditable. We're the only policy layer with zero-retention reasoning.

**What we have**: Venice.ai integration (GLM-5), real tests (clean = allow, injection = block), "Private reasoning, zero retention" section in README.

**Narrative**: "Agent reasoning is the most sensitive data in crypto. Mandate keeps it private via Venice.ai. The decision is public. The thinking stays sealed."

---

### #3. OpenWallet Standard (MoonPay) — NEW
**Prize: $3,500 | Fit: 9/10 | Effort: LOW**
**UUID**: `e5bc7301d9d1...` (need full)

**What judges want**: Implement, extend, or build on OWS (open-source, CC0, chain-agnostic wallet standard). New chain plugins or **policy types**. Infrastructure-level.

**Why we fit**: OWS explicitly mentions "policy types" as an extension point. Mandate IS a policy type. We can implement Mandate as an OWS policy plugin: every wallet using OWS gets intent-aware decisioning. Chain-agnostic (we already support Ethereum, Base, Solana, TON, BNB).

**What to do**: Read OWS spec, implement MandatePolicy as an OWS policy type. Show any OWS wallet getting Mandate protection.

**Narrative**: "OWS defines the wallet standard. Mandate defines the policy standard. Together: any wallet, any chain, intent-aware protection."

---

### #4. Agent Services on Base — NEW
**Prize: $5,000 | Fit: 8/10 | Effort: MEDIUM**
**UUID**: `6f0e3d7dcadf...` (need full)

**What judges want**: Agent service discoverable on Base, accepts x402 payments, provides meaningful utility to other agents/humans.

**Why we fit**: Mandate IS an agent service. Other agents pay per validation (x402). "Is this transaction safe?" is a service every agent wallet needs. We already have MCP server and SKILL.md for discovery.

**What to do**: Add x402 payment endpoint to Mandate API. Register as discoverable service on Base. Show agent-to-agent flow: Agent A discovers Mandate, pays per validation via x402, gets policy decision.

**Narrative**: "Mandate as a service. Any agent pays per validation. Is this tx safe? Ask Mandate."

---

### #5. Agents With Receipts — ERC-8004 (Protocol Labs)
**Prize: $4,000 | Fit: 9/10 | Effort: LOW**
**UUID**: `3bf41be958da497bbb69f1a150c76af9`

**What judges want**: ERC-8004 identity + reputation as core trust infrastructure. On-chain verifiability. Agent manifests. Trustless design.

**Why we fit**: ReputationService already queries ERC-8004 via The Graph (4 chains). Envelope verification = on-chain receipts. Every intent is auditable.

**What to add**: agent.json manifest, agent_log.json export from audit trail.

**Narrative**: "Every Mandate transaction is a receipt. On-chain proof that what the agent said matches what it did."

---

### #6. Let the Agent Cook (Protocol Labs)
**Prize: $4,000 | Fit: 8/10 | Effort: MEDIUM**
**UUID**: `10bd47fac07e...`

**What judges want**: Full autonomous loop (discover, plan, execute, verify). Multi-tool orchestration. Safety guardrails. No human-in-the-loop.

**Why we fit**: Mandate IS the safety guardrail. An agent using MandateWallet demonstrates the full loop with built-in accountability. Our demo video shows this.

**What to add**: Full autonomous demo agent with structured execution log.

**Narrative**: "Full autonomy requires full accountability. Mandate lets agents cook while keeping the kitchen safe."

---

### #7. Best Bankr LLM Gateway Use
**Prize: $5,000 | Fit: 8/10 | Effort: LOW**
**UUID**: `dcaf0b1bf5d4...`

**What judges want**: Multi-model usage, real on-chain execution through Bankr, self-sustaining economics.

**Why we fit**: Bankr is a live-supported wallet. Venice.ai (private reasoning) + Bankr Gateway (multi-model) = layered intelligence. Mandate validates Bankr wallet transactions.

**What to show**: Dual-model: Venice for private reasoning, Bankr for inference. Agent earning fees through Bankr, Mandate enforcing budget caps.

**Narrative**: "Bankr powers the wallet. Venice powers the reasoning. Mandate ensures neither goes rogue."

---

### #8. Best Use of Locus
**Prize: $3,000 | Fit: 9/10 | Effort: LOW**
**UUID**: `f50e31188e26...`

**What judges want**: Deep Locus integration, autonomous USDC payments on Base, spending controls, auditability.

**Why we fit**: Locus is live-supported. Mandate adds exactly what Locus needs: spend limits, allowlists, approval workflows, audit trail. Locus handles USDC escrow, Mandate validates intent.

**Narrative**: "Locus moves the money. Mandate decides if it should."

---

### #9. Best Use of Delegations (MetaMask)
**Prize: $5,000 | Fit: 7/10 | Effort: MEDIUM**
**UUID**: `0d69d56a8a08...`

**What judges want**: Creative use of MetaMask Delegation Framework. ERC-7715 permissions. Sub-delegations, intent-based delegations.

**Why we fit**: MetaMask delegations = ON-CHAIN permissions (what agent CAN do). Mandate = INTENT-LEVEL policy (what agent SHOULD do). Complementary layers. "Session keys see {to, value, calldata}. Mandate sees the reasoning."

**What to add**: ERC-7715 permission request flow integration.

**Narrative**: "MetaMask delegates authority. Mandate validates intent. Permission + judgment."

---

### #10. Go Gasless (Status Network)
**Prize: $2,000 | Fit: 5/10 | Effort: LOW (qualification-based)**
**UUID**: `877cd61516a1...`

**What judges want**: Deploy contract on Status Network Sepolia, execute gasless tx, include AI agent component, tx hash proof.

**Why**: Qualification-based bounty (equal split among ~40 qualifiers = ~$50 each). Low effort (~1h) but small payout. Include only if we have time.

**Narrative**: "Mandate works on any EVM. Including gasless chains."

---

## Tracks NOT in Top 10 (with reasoning)

| Track | Prize | Why skip |
|-------|-------|----------|
| **Autonomous Trading Agent** (Base) | $5,000 | Requires proven profitability in trading. We're policy, not a trading strategy. |
| **EigenCompute** | $5,000 | Docker on TEE. Not our stack, would need to rewrite backend. |
| **Uniswap** | $5,000 | Requires real swaps with Uniswap API. DEX integration, not policy. |
| **Celo** | $5,000 | Celo-specific payment flows (MiniPay). Niche. |
| **Lido MCP** | $5,000 | stETH/wstETH MCP server. Not our domain. |
| **OpenServ** | $4,500 | OpenServ must be "core infra." Integration too deep for the fit. |
| **MoonPay CLI** | $3,500 | MCP server for swaps. Could work but thin narrative. |
| **OpenWallet Standard** | $3,500 | Actually RECOMMENDED (see #3). |
| **Bond.credit** | $1,500 | Live GMX perps trading on Arbitrum. High risk. |
| **Filecoin** | $2,000 | Storage, not payments. Zero overlap. |
| **Virtuals ERC-8183** | $2,000 | Specific standard, thin integration. |
| **Student Founders** | $2,500 | Students only. |
| **Self Protocol** | $1,000 | ZK identity. Small prize, auxiliary. |
| **ENS** | $1,500 | Small prize. Nice-to-have but not top 10. |
| **Lido stETH Treasury** | $3,000 | Yield spending. Not our domain. |
| **Olas** | $3,000 | Mech-client framework. New stack to learn. |
| **SuperRare** | $2,500 | NFT art. No. |
| **Octant** | $3,000 | Public goods evaluation. Orthogonal. |
| **Slice** | $2,200 | Commerce hooks. Auxiliary. |
| **Arkhai** | $900 | Escrow. Small. |
| **Markee** | $800 | GitHub metrics. Zero overlap. |
| **Ampersend** | $500 | Too small. |
| **Zyfai** | $1,500 | Yield. Not our domain. |
| **Dark Knowledge** | $250 | Lit Protocol TEE. Too small, wrong stack. |

---

## Summary: Recommended Top 10

| Rank | Track | Sponsor | Prize | Fit | Effort |
|------|-------|---------|-------|-----|--------|
| 1 | **Synthesis Open Track** | Community | $28,134 | 10/10 | DONE |
| 2 | **Private Agents, Trusted Actions** | Venice | $11,500 | 10/10 | DONE |
| 3 | **OpenWallet Standard** | MoonPay | $3,500 | 9/10 | LOW |
| 4 | **Agent Services on Base** | Base | $5,000 | 8/10 | MEDIUM |
| 5 | **Agents With Receipts** | Protocol Labs | $4,000 | 9/10 | LOW |
| 6 | **Let the Agent Cook** | Protocol Labs | $4,000 | 8/10 | MEDIUM |
| 7 | **Best Bankr LLM Gateway** | Bankr | $5,000 | 8/10 | LOW |
| 8 | **Best Use of Locus** | Locus | $3,000 | 9/10 | LOW |
| 9 | **Best Use of Delegations** | MetaMask | $5,000 | 7/10 | MEDIUM |
| 10 | **Go Gasless** | Status Network | $2,000 | 5/10 | LOW |

**Total addressable prize pool: $71,134**
**Top 4 (highest conviction, zero effort): $47,634**

---

*Updated from track_research18-04.md with latest prize pools and new tracks (Base, MoonPay, EigenCloud, Filecoin).*
