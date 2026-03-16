# Playing to Win — Mandate Strategy

Framework: Roger Martin & A.G. Lafley (2013)
Updated: March 2026 — with competitive landscape analysis

---

## The Five Choices

### 1. Winning Aspiration

Become the default spend policy and authorization layer for every AI agent that handles money or takes high-impact external actions — **regardless of which wallet or framework the team uses**.

Not: "a wallet for AI agents."
Not: "an agent security platform."
Not: "a governance dashboard."

The right framing: **the control plane that makes autonomous agent spending safe, governable, and auditable at scale — and that works above any wallet, on any chain.**

Target: category leadership in agent spend governance before Coinbase ships vendor allowlists and multi-chain support. The Genesis window is open now. It will not stay open indefinitely.

---

### 2. Where to Play

**Primary beachhead:** Teams building production AI agents that already use Privy, Openfort, CDP, or Safe — and have hit the ceiling of what wallet-native policies can do.

The ceiling is clear: wallet-native policies (Openfort, Privy) give you per-tx controls but cannot answer:
- Has this agent exceeded its $500/day budget?
- Is it sending too many transactions this hour?
- Should it auto-pause because it just spent 3× its normal rate?
- What if we switch wallets next month — do we lose all our policy configuration?

These teams exist and are growing. They already have a wallet. They need the layer above it.

**Secondary beachhead:** Teams on non-Openfort, non-Privy wallets (Safe, custom EVM, ARC, StarkNet) who have NO wallet-native policy engine at all — Mandate is the only option.

**Secondary beachhead (parallel):** SaaS AI agents spending on API services — LLM calls, data APIs, external tools — where the "wallet" is a credit card or API key, not crypto.

**Expansion path:**
1. Crypto agent builders on non-Base chains → first design partners, fastest pain
2. Multi-chain crypto agents (including Base) → wallet-agnostic framing beats Coinbase
3. SaaS AI agents with API/cloud spend → same policy primitives, different wallet type
4. Enterprise agentic workflows with procurement actions → compliance + audit angle

**Not playing:**
- Custody and key management — delegate to Privy, CDP, Safe
- Blockchain rails — delegate to providers
- General agent threat detection — Zenity and Microsoft own that layer
- Authentication and OAuth — Arcade and WorkOS own that layer

---

### 3. How to Win

**Wallet-agnostic spend policy middleware that plugs into any agent stack.**

The winning move is not to compete with wallets or auth platforms — it is to own the spend governance layer that none of them provide.

**Competitive differentiation:**

| Capability | Coinbase | Openfort | Privy | Leash/Microsoft | **Mandate** |
|---|---|---|---|---|---|
| Wallet-agnostic | ✗ | ✗ | ✗ | ✓ | **✓** |
| Per-tx value caps | partial | **✓** | ✓ | ✗ | **✓** |
| Address allowlists | ✗ | **✓** | ✓ | ✗ | **✓** |
| ABI-level calldata controls | ✗ | **✓** | partial | ✗ | **✓** |
| **Daily/cumulative budget** | ✗ | ✗ | ✗ | ✗ | **✓ UNIQUE** |
| **Velocity limits (tx/period)** | ✗ | ✗ | ✗ | ✗ | **✓ UNIQUE** |
| **Stateful circuit breakers** | ✗ | ✗ | ✗ | partial | **✓ UNIQUE** |
| Agent framework integrations | ✗ | ✗ | ✗ | ✗ | **✓ UNIQUE (7)** |
| Multi-chain | ✗ (Base) | ✓ (EVM+Sol) | ✓ | ✓ | **✓** |

**The corrected competitive story:**
Openfort and Privy already have per-tx policies with address allowlists — but only for teams using their wallets. Mandate is not "the only policy engine." It is **the stateful, wallet-agnostic layer** that adds the temporal dimension (daily budgets, velocity) and cross-wallet portability that no wallet provider can build without cannibalizing their own lock-in.

**Why wallet providers structurally cannot close Mandate's gap:**
- Openfort and Privy benefit from wallet lock-in — building wallet-agnostic tools cannibalizes their own moat
- Coinbase's revenue model depends on transaction volume — policies that truly restrict spend conflict with their incentives
- All wallet providers are stateless at the policy level — tracking cumulative spend across sessions requires persistent state that doesn't fit the signing-key business model
- None of them will build framework integrations (ElizaOS plugin, Claude Code hook) — that's developer tooling, not wallet infrastructure

**The positioning that wins:**
> Agents propose. Policy decides. Infrastructure enforces. Humans intervene only on exceptions.

---

### 4. Capabilities Required

| Capability | Status | Priority |
|---|---|---|
| Policy engine: budget, vendor, velocity, time-delay | Core SDK shipped | Shipped |
| 7 framework integrations | All complete, tests pass | Shipped |
| Circuit breakers + kill switch | Spec complete | Ship now |
| Design partner pipeline | Not started | Urgent |
| Anomaly detection v1 (rule-based) | Roadmap | Next sprint |
| Audit log with incident replay | Roadmap | Next sprint |
| Operator dashboard (non-developer UX) | Roadmap | After 3 design partners |
| EIP-8004 / EIP-8183 standards participation | Roadmap | High leverage |

**The moat builds through four layers:**
1. Integration depth (7 frameworks today, more as ecosystem grows)
2. Policy data from production deployments → better anomaly detection
3. Standard-setting through EIP participation
4. Switching cost: your policy rules live in code and in Mandate's audit log

---

### 5. Management Systems

**What to measure:**
- Agents under management (AUM — count)
- Dollar value of spend governed per day
- Policy violations blocked vs. passed
- Framework integrations with active users
- Design partners in staging → production conversion
- Time-to-onboard (hours from SDK install to first policy active)

**Leading indicator to watch obsessively:** How long does it take a new team to go from `npm install @mandate/sdk` to first policy active? Every hour of friction lost is a design partner not acquired.

**Decision rule for prioritization:**
Does this feature increase value governed, or reduce time-to-first-policy? If neither, deprioritize.

**Competitive watch triggers:**
- Openfort or Privy ship daily/cumulative budget tracking → accelerate anomaly detection and circuit breakers; the stateful dimension is the last moat
- Coinbase adds multi-chain + address allowlists → wrap Coinbase with Mandate policy layer; turn threat into distribution
- Microsoft productizes governance toolkit with spend primitives → reinforce stateful spend as differentiator
- Any wallet provider ships "agents under management" dashboard → accelerate Mandate's operator UX roadmap

---

## Strategic Coherence Check

| Choice | Consistent? | Competitive Angle |
|---|---|---|
| Aspiration: default control plane | ✓ | No player owns this layer wallet-agnostically |
| Where to play: non-Base chains first | ✓ | Coinbase cannot reach there |
| How to win: spend policy middleware | ✓ | Unique capability combination |
| Capabilities: SDK + integrations + circuit breakers | ✓ | Matches the white space |
| Management: measure value governed | ✓ | Aligned with spend-specific positioning |

---

## Biggest Strategic Risks (updated with competitors)

1. **Coinbase velocity**: they already have session caps + KYT. Adding vendor allowlists and multi-chain is a product sprint, not a research project. Time is the real constraint.

2. **Microsoft distribution**: if Azure AI Security ships a productized version of the governance toolkit with spend primitives, enterprise deals become very hard.

3. **Market timing**: only 14.4% of organizations report agents going live with full security/IT approval (Gravitee 2026 report). Most teams have not yet felt the spend pain in production. Revenue lags deployment by 12–18 months.

4. **Open source commoditization**: if Mandate publishes the policy spec openly, large players can implement it. Mitigated by: managed service, audit infrastructure, design partner relationships.

---

Sources:
- [Playing to Win — Farnam Street](https://fs.blog/playing-to-win-how-strategy-really-works/)
- [Coinbase Agentic Wallets launch](https://www.coinbase.com/developer-platform/discover/launches/agentic-wallets)
- [StrongDM Leash](https://leash.strongdm.ai/)
- [Microsoft Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit)
- [Arcade authorization](https://docs.arcade.dev/home/auth/how-arcade-helps)
- [Zenity platform](https://zenity.io/platform)
- [State of AI Agent Security 2026 — Gravitee](https://www.gravitee.io/blog/state-of-ai-agent-security-2026-report-when-adoption-outpaces-control)
- [SWOT analysis](./swot-competitive.md)
