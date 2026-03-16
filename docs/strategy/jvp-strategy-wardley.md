# Wardley Mapping — Mandate Strategy

Framework: Simon Wardley
Updated: March 2026 — with competitive landscape analysis

---

## Reading This Map

- **Y axis**: Visibility to user — top = visible, bottom = infrastructure
- **X axis**: Evolution — Genesis → Custom Built → Product → Commodity

**Strategic rule:** Differentiate on Genesis/Custom. Integrate with Product/Commodity. Do not build what is already Commodity.

**Key update from competitor scan:** Several previously Genesis components are moving faster than expected. Coinbase's entry into spending controls means the "policy engine" layer is no longer purely Genesis — it is transitioning. Mandate must move now.

---

## User Need

> Teams want to deploy AI agents that take costly or irreversible external actions — but they cannot do so safely without controllable spending authority, vendor governance, and auditable circuit breakers.

---

## Value Chain Map

```
[User: Agent-deploying team]
         |
         ↓ needs
[Safe autonomous agent deployment]
         |
    ┌────┴────────────────────────────────────┐
    ↓                                         ↓
[Agent Framework]                    [Spend Governance Layer]
(ElizaOS, AgentKit, GAME,            (policy engine, vendor allowlists,
 Claude Code, GOAT, OpenClaw)         velocity limits, circuit breakers,
 → Custom, moving to Product          anomaly detection, audit replay)
                                      → GENESIS: Mandate's core territory
    |                                         |
    └──────────────────┬──────────────────────┘
                       ↓
              [Auth & Identity Layer]
              (Arcade JIT auth, WorkOS FGA,
               Microsoft zero-trust SPIFFE/SVID)
               → Custom (forming fast)
                       |
                       ↓
              [Containment Layer]
              (StrongDM Leash, Microsoft toolkit
               OS-level sandboxing, Cedar policies)
               → Custom
                       |
                       ↓
              [Wallet Layer]
              (Coinbase CDP, Privy, Safe,
               MandateWallet wrapper)
               → Custom → Product
                       |
                       ↓
              [Blockchain Rails]
              (Base, Ethereum, ARC, StarkNet)
               → Commodity
                       |
                       ↓
              [LLM Inference]
              (Claude, GPT-4o, Gemini)
               → Product → Commodity
```

---

## Component Evolution Analysis

### Agent Frameworks (ElizaOS, AgentKit, GAME, Claude Code, GOAT)

**Stage: Custom → Product (accelerating)**

New frameworks every quarter in early 2025. Consolidation beginning in 2026. ElizaOS, AgentKit, and Claude Code are pulling ahead in developer adoption.

**Mandate's position:** Maintain 7 integrations, prioritize by active user count. As consolidation happens, double down on the 2–3 winners and reduce maintenance cost on trailing frameworks. Framework breadth was a moat in Genesis — in Product stage it is table stakes.

**Warning signal:** If one framework (ElizaOS or AgentKit) captures >60% of builder mindshare, all other integrations become low-priority maintenance.

---

### Spend Governance Layer — Policy Engine, Vendor Allowlists, Velocity Limits

**Stage: Late Genesis / Early Custom — MOVING, BUT WHITE SPACE CONFIRMED**

**Updated map after full wallet scan:**

```
Genesis ←————————————————————————→ Custom → Product
   |            |              |
   |  Mandate   |   Openfort   |   Coinbase
   |  (stateful |   (stateless |   (session caps
   |  budgets,  |   per-tx:    |    only, Base)
   |  velocity, |   allowlists,|
   |  circuit   |   ABI, multi-|
   |  breakers, |   chain)     |
   |  agnostic) |              |
   |____________|______________|
        ↑
   Confirmed white space (no competitor):
   - daily/weekly cumulative budget
   - velocity limits (tx/period)
   - stateful circuit breakers
   - wallet-agnostic portability
   - framework integrations
```

**Critical correction**: Openfort already has address allowlists, ABI calldata controls, multi-chain, and pre-flight evaluation. These are at Custom stage. Mandate claiming ownership of allowlists was wrong.

**Mandate's actual Genesis territory** (confirmed unoccupied):
1. Stateful cumulative budget tracking across transactions
2. Velocity limits (N transactions per time period)
3. Automatic circuit breakers that fire on threshold breach
4. Wallet-agnostic portability across any wallet provider
5. Agent framework integrations at the plugin level

**Strategic move:** Publish the Mandate Policy Spec as an open draft. Influence EIP-8004 to reference it. If the spec becomes the standard, Mandate's managed service is the reference implementation — even if others implement the spec.

---

### Auth & Identity Layer (Arcade, WorkOS FGA)

**Stage: Custom (forming as a distinct category)**

Arcade: JIT auth, zero token exposure, human-in-loop.
WorkOS: FGA with hierarchical permissions, sub-50ms.
Microsoft toolkit: Ed25519 + SPIFFE/SVID agent identity.

This layer is legitimizing as a separate category from spend governance.

**Mandate's position:** Do NOT compete here. Integrate. `@mandate/sdk` should be composable with Arcade for auth and with Mandate for spend. Position: "Arcade handles who can act; Mandate handles what they can spend."

**Partnership opportunity:** Arcade + Mandate integration. They cover auth, Mandate covers spend. Natural bundle for teams that need both.

---

### Containment Layer (StrongDM Leash, Microsoft toolkit)

**Stage: Custom (open source, not yet Product)**

Leash: OS-level MCP interception, Cedar policies, network boundaries.
Microsoft: OWASP 10/10, zero-trust, Python-level enforcement.

Both are open source and technically strong. Neither addresses spend governance.

**Mandate's position:** Complementary. Not competitive. Reference both in docs: "For network containment, use Leash. For spend governance, use Mandate. They compose."

**Opportunity:** The developer who installs Leash for network policy is the same developer who needs Mandate for spend policy. Target these communities directly.

---

### Security Monitoring Layer (Zenity)

**Stage: Custom → Product (enterprise track)**

Zenity is Fortune Cyber 60, RSA Conference speaker, enterprise SaaS. Fortune 500 buyer, not builder buyer.

**Mandate's position:** Complementary at the enterprise stack level. Zenity → CISO buys detection; engineering team needs Mandate for prevention. Target the Zenity enterprise customer's engineering team.

**Wardley insight:** Zenity is evolving along the enterprise SaaS track (Custom → Product → Commodity in the CISO stack). Mandate is evolving along the developer infra track (Genesis → Custom in the builder stack). These are parallel evolutionary paths, not the same component.

---

### Wallet Layer (Coinbase CDP, Privy, Safe)

**Stage: Custom → Product (accelerating)**

Multiple providers with clear specs. Differentiation narrowing to custody model, chain support, and developer experience.

**Mandate's position:** Wallet-agnostic by design. As wallets commoditize, demand for wallet-agnostic policy grows. Every new wallet entrant is a Mandate integration opportunity, not a threat.

**Warning signal from Coinbase:** Coinbase is the one player that has both wallet infrastructure AND is adding policy primitives. This is the only position on the map where a competitor can threaten Mandate from below (wallet layer) rather than from above (enterprise security layer).

**Counter-move:** Wrap Coinbase. `@mandate/agentkit-provider` already exists. Make "Mandate above CDP" a documented, supported configuration. Turn the threat into a distribution channel.

---

### Blockchain Rails (Base, Ethereum, ARC, StarkNet)

**Stage: Commodity**

Do not build. Partner. Mandate is chain-agnostic by design.

**Strategic advantage:** Coinbase Agentic Wallet is Base-only. Every team on Ethereum, ARC, StarkNet, Solana has no Coinbase option. They are Mandate's first-mover beachhead.

---

### LLM Inference (Claude, GPT-4o)

**Stage: Product → Commodity**

Leverage for features (policy synthesis, anomaly explanation, incident summarization). Do not build.

---

## Full Competitive Wardley Positioning

```
                    Genesis    Custom     Product   Commodity
                       |         |          |          |
Visible to user:       |         |          |          |
  Safe agent deploy    |●        |          |          |
                       |         |          |          |
Spend governance:      |         |          |          |
  Mandate (full DSL)  ●|         |          |          |
  Coinbase (caps only) |    ●    |          |          |
                       |         |          |          |
Auth & identity:       |         |          |          |
  Arcade (JIT)         |    ●    |          |          |
  WorkOS FGA           |         |    ●     |          |
                       |         |          |          |
Containment:           |         |          |          |
  Leash (MCP)          |    ●    |          |          |
  Microsoft toolkit    |    ●    |          |          |
                       |         |          |          |
Monitoring:            |         |          |          |
  Zenity               |         |    ●     |          |
                       |         |          |          |
Wallet layer:          |         |          |          |
  CDP / Privy / Safe   |         |    ●→    |          |
                       |         |          |          |
Infra (invisible):     |         |          |          |
  Blockchain rails     |         |          |          |●
  LLM inference        |         |          |●         |
```

---

## Strategic Moves from the Map

### Move 1: Colonize the spend governance Genesis space before Coinbase reaches full Custom

The policy engine for agent spend is in Genesis/early Custom. Coinbase is there with basic features. The full implementation (vendor allowlists + velocity + anomaly + audit) is not shipped by anyone.

**Action:** Ship vendor allowlists and velocity limits this sprint. This is the move that matters most right now.

### Move 2: Influence EIP-8004 / EIP-8183 to reference Mandate Policy Spec

In Genesis markets, whoever defines the standard wins even if commoditization follows. Publish the Mandate Policy Spec as a draft EIP comment. The goal is for future wallet providers to implement "Mandate-compatible policy" — making every new wallet provider a Mandate distribution channel.

### Move 3: Position as the layer between containment and wallets

Leash handles network. Microsoft handles identity. Wallets handle keys. Mandate handles spend. None of these compete — they compose. Document this stack clearly and become the reference architecture for agent security.

**Referencing Mandate in OWASP Agentic Top 10 documentation** would cement this position in the developer standard.

### Move 4: Use Coinbase's Base-only limitation as a beachhead

Every team not on Base cannot use Coinbase Agentic Wallet's controls. These teams are Mandate's easiest first customers. Non-Base chain support is a feature that Coinbase cannot add quickly (multi-chain is a major infrastructure investment for a regulated entity).

### Move 5: Let wallets commoditize — stay above them

As wallets move from Custom to Product, they become interchangeable. Mandate's value proposition (same policy rules regardless of which wallet you use) becomes more valuable as wallet switching costs drop. Each new wallet entrant strengthens Mandate's positioning.

---

## Map Summary Table

| Component | Stage | Mandate Action |
|---|---|---|
| Spend governance (full DSL) | **Genesis** | **Invest maximum — core product** |
| Agent frameworks | Custom → Product | Maintain top 3 integrations, reduce tail |
| Auth / identity layer | Custom | Integrate with Arcade, WorkOS — don't compete |
| Containment layer | Custom | Complement Leash/Microsoft — document the stack |
| Monitoring / detection | Custom → Product | Complement Zenity — target their engineering teams |
| Wallet layer | Custom → Product | Integrate all, compete with none |
| Blockchain rails | Commodity | Partner, chain-agnostic by design |
| LLM inference | Product → Commodity | Leverage for features |

---

## Updated Strategic Insight

> The spend governance layer is in Genesis but moving. Mandate has a 2–3 sprint lead on Coinbase's full policy primitives. EIP standards are forming. The Wardley play is: define the Genesis standard now, let others implement it later, be the reference managed service. Build Genesis while the window is open — the window is measured in sprints, not years.

---

Sources:
- [Wardley Maps — Evolution Stages](https://www.wardleymaps.com/glossary/evolution-stages)
- [Coinbase Agentic Wallets](https://www.coinbase.com/developer-platform/discover/launches/agentic-wallets)
- [StrongDM Leash](https://leash.strongdm.ai/)
- [Microsoft Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit)
- [Zenity Platform](https://zenity.io/platform)
- [Arcade Authorization](https://docs.arcade.dev/home/auth/how-arcade-helps)
- [SWOT analysis](./swot-competitive.md)
