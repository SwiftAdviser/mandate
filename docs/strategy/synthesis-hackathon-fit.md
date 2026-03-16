# Mandate × Synthesis Hackathon — Strategic Fit Analysis

> **Synthesis** — online hackathon, Mar 13–22, 2026. Theme: build infrastructure for AI agents that move money, make commitments, and call services on behalf of humans.
>
> Judging principle: *"A working demo of one well-scoped idea beats an ambitious architecture diagram."*

---

## The 4 Tracks

| Track | Core Problem | Key Criteria |
|---|---|---|
| **Agents that Pay** | Agents move money through centralized services that can block/reverse/surveil | Scoped spending, onchain settlement, auditable history, transparent verification |
| **Agents that Trust** | Agent access depends on centralized registries that can revoke permissions | Onchain attestations, portable credentials, open discovery, verifiable quality |
| **Agents that Cooperate** | Agent commitments are enforced by platforms that can change terms unilaterally | Smart contract enforcement, human-defined boundaries, dispute resolution, composable primitives |
| **Agents that Keep Secrets** | Agent activity leaks metadata about human users | Private payment rails, ZK authorization, encrypted comms, human-controlled disclosure |

---

## Mandate vs Hackathon Criteria

| Criterion | Track | Mandate Coverage | Score |
|---|---|---|---|
| Scoped spending permissions / authority | Pay | PolicyEngine: per-tx limits, allowlists, function selectors | ✅ Strong |
| Auditable transaction history | Pay | IntentStateMachine + AuditLog page | ✅ Strong |
| Transparent verification of execution | Pay | EnvelopeVerifier: on-chain tx vs validated params — mismatch trips circuit breaker | ✅ Strong |
| Human-defined boundaries | Cooperate | PolicyBuilder UI: spend limits, time rules, vendor allowlists | ✅ Strong |
| Human-in-the-loop for exceptions | Pay / Cooperate | Approvals flow: `approval_pending` → dashboard sign-off | ✅ Strong |
| Kill switch / circuit breaker | Pay / Cooperate | CircuitBreakerService: auto-trips on anomaly or envelope mismatch | ✅ Strong |
| Non-custodial (no key holding) | Pay | Agent signs locally; Mandate never sees private key | ✅ Strong |
| **Daily / cumulative budget tracking** | Pay | QuotaManagerService: daily/weekly/monthly caps with quota reservations | ✅ Unique |
| **Velocity limits (N tx/period)** | Pay | QuotaManager: max N transactions per time window | ✅ Unique |
| **Multi-framework agent integrations** | All | 7 frameworks: ElizaOS, AgentKit, GOAT, MCP, Claude Code, GAME, OpenClaw | ✅ Unique |
| Working demo candidate | All | MandateWallet + Uniswap Trading API = DeFi bot demo | ✅ Deliverable |
| Onchain enforcement (smart contract) | Pay / Cooperate | ❌ Off-chain API only — agent can bypass if compromised | ❌ Gap |
| Settlement guarantee without intermediary | Pay | ❌ Mandate IS an off-chain intermediary | ❌ Gap |
| Agent identity / onchain attestations | Trust | ❌ RuntimeKey = API token, not Ethereum identity | ❌ Gap |
| Portable credentials tied to Ethereum | Trust | ❌ Not built | ❌ Gap |
| Composable onchain primitives (escrow/slash) | Cooperate | ❌ Not built | ❌ Gap |
| ZK authorization / private rails | Secrets | ❌ Not built | ❌ Gap |

---

## Superpower — What We Have That No Competitor Does

### Already shipped

1. **Stateful cumulative budgets** — daily/monthly spend caps with quota reservations per intent. Competitors (Openfort, Privy, Coinbase) only do per-transaction limits.
2. **Velocity limits** — max N transactions per time window. Catches runaway loops and compromised agents.
3. **Envelope verifier** — after broadcast, Mandate fetches the on-chain tx and compares it to validated parameters. Mismatch = automatic circuit trip. No competitor has this.
4. **Stateful circuit breaker with auto-trip** — agent goes `active → circuit_broken` on anomaly. All subsequent txs rejected with 403 until human resets.
5. **7 agent framework integrations** — ElizaOS, AgentKit, GOAT, Cloudflare MCP, Claude Code hook, GAME (Virtuals), OpenClaw, ACP. No competitor covers this breadth.

### Unique opportunity ahead

- **Behavioral drift detection** (in research) — hash chain of agent intent profile: if agent's behavioral fingerprint changes between interaction windows, block before execution. No standard exists. No competitor is building it.

---

## Critical Gaps (What We Must Address to Win)

| Gap | Why It Matters | Minimal Fix |
|---|---|---|
| **Onchain enforcement** | Agent can ignore our API if hacked or hallucinating. Kills "no intermediaries" story. | Deploy `PolicyVerifier.sol` — verifies intentId signature onchain before tx executes |
| **No smart contract component** | Hackathon favors Ethereum infra. Judges expect onchain proof-of-policy. | Same PolicyVerifier on Base Sepolia |
| **Agent identity is an API token** | RuntimeKey ≠ Ethereum identity. Can't integrate with EIP-8004 registry without ETH address. | Map `agentId` → ETH address at registration |

**PolicyVerifier.sol (1-day build):**
- Mandate server signs `keccak256(intentId)` with its EOA
- Agent calls `verifyIntent(intentId, signature)` on contract before broadcasting
- Contract verifies signature, emits `IntentCleared(intentId, agent)` event
- Gives "onchain enforcement, not just API" story — the policy lives on Ethereum

---

## EIP-8004 / EIP-8183 Integration Opportunity

### EIP-8004 — Trustless Agents (draft, Aug 2025)

On-chain agent registry + reputation layer:
- **Identity Registry**: ERC-721 NFT per agent with metadata (name, endpoints, wallet addresses)
- **Reputation Registry**: on-chain feedback — `starred`, `uptime`, `successRate`, `revenues`, `tradingYield`
- **Validation Registry**: third-party trust scores (zkML, TEE, staking-based verifiers)

**Mandate integration:**
```
/validate pipeline:
  → [NEW] EIP-8004 reputation check — block agents below trust threshold
  → [NEW] agentproof.sh — external agent proof compatible with EIP-8004
  → PolicyEngine: spend limits, allowlists, selectors

After intent confirmed:
  → [NEW] emit EIP-8004 feedback event (successRate++)
```

### EIP-8183 — Agentic Commerce (draft, Feb 2026)

On-chain job escrow with evaluator attestation:
- `createJob → fund → submit → complete/reject`
- **Optional hooks** per job: `beforeAction(jobId, selector, data)` / `afterAction(...)`
- Mandate policy engine = the hook. Gate fund release by spend policy.

**Mandate integration:**
- Register as EIP-8183 policy hook → any ACP job can route through Mandate spend validation before releasing escrow
- Combined: EIP-8004 identity + EIP-8183 escrow + Mandate spend policy = complete trustless agent commerce stack

### aegis402.com + web3antivirus.io

- **web3antivirus.io API**: honeypot token detection, suspicious contract risk scoring
- **aegis402.com**: our security layer combining x402 agent payments with web3antivirus scanning
- **Status**: listed in feature-brainstorm.md as "Do Now" (priority Блок 1.1) — tool already available

**In `/validate` pipeline:**
```
Agent submits tx to /validate
  → [NEW] web3antivirus scan: is destination a honeypot?
  → [NEW] token risk score check
  → PolicyEngine: spend limits, allowlists
  → Return: allowed + intentId, or blocked + reason
```

This upgrades Mandate from spend policy → **full-stack agent security layer**: spend governance + honeypot protection + agent reputation + onchain enforcement.

---

## Competitive Positioning

| Capability | Mandate | Openfort | Privy | Coinbase CDP |
|---|---|---|---|---|
| Per-tx spend limits | ✅ | ✅ | ✅ | Partial |
| Address allowlists | ✅ | ✅ | ✅ | ✗ |
| **Daily cumulative budgets** | ✅ **UNIQUE** | ✗ | ✗ | ✗ |
| **Velocity limits** | ✅ **UNIQUE** | ✗ | ✗ | ✗ |
| **Stateful circuit breaker** | ✅ **UNIQUE** | ✗ | ✗ | ✗ |
| **7+ framework integrations** | ✅ **UNIQUE** | ✗ | ✗ | ✗ |
| **Wallet-agnostic** | ✅ **UNIQUE** | ✗ (own wallet) | ✗ (own wallet) | ✗ (Base only) |
| Honeypot detection | Roadmap | ✗ | ✗ | Partial (KYT) |
| EIP-8004 integration | Roadmap | ✗ | ✗ | ✗ |
| EIP-8183 policy hook | Roadmap | ✗ | ✗ | ✗ |

**Moat narrative**: Wallet providers have stateless, per-transaction policies locked to their own infrastructure. Mandate is the stateful, wallet-agnostic temporal layer — cumulative budgets, velocity limits, behavioral signals, EIP-8004/8183 standard compliance — that works *above* any wallet and survives wallet migrations.

---

## Track Recommendation

### Primary: Track 1 (Agents that Pay) + Uniswap Partner Track

**Why Track 1:**
- 80%+ of Mandate's built capabilities directly answer this track's criteria
- The core problem statement matches Mandate's thesis word-for-word: *"Agents move money. Infrastructure was built for humans, not machines."*

**Why Uniswap:**
- Partner bounty = double prize opportunity (Open Track + Uniswap)
- Demo: DeFi trading bot using Uniswap Trading API + MandateWallet
  - `$100/day` loss limit
  - Circuit breaker trips at 3 failed txs
  - Human approval required for single tx > $50
  - web3antivirus checks token before every swap
- This is a real use case (trading bots already in prod causing losses)

**Build scope to close the gap:**
1. `PolicyVerifier.sol` on Base Sepolia (~1 day)
2. Uniswap Trading API integration in `@mandate/sdk` (~1 day)
3. Demo script: agent loop + policy enforcement in action (~1 day)

### Alternative: Track 3 (Agents that Cooperate)

- PolicyBuilder = human-defined boundaries ✅
- Circuit breaker ≈ slashing mechanism ✅
- Weaker fit: no inter-agent coordination, no smart contract enforcement yet
- Missing: escrow, staking, dispute resolution primitives

---

## One-Line Pitch for Submission

> **Mandate is the non-custodial control plane for AI agent spending — enforcing spend limits, velocity caps, and circuit breakers across any wallet and any framework, with EIP-8004 trust scoring and web3antivirus honeypot detection in the validation pipeline.**

---

*Generated: 2026-03-13 | Sources: synthesis.md, github.com/sodofi/synthesis-hackathon, /docs/eip-8004-trustless-agents.md, /docs/eip-8183-agentic-commerce.md, /docs/stories/feature-brainstorm.md, /docs/strategy/swot-competitive.md*
