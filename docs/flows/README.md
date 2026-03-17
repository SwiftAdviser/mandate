# Mandate — Transaction Flows

Three scenarios showing how Mandate protects agent wallets.

| # | Flow | Outcome | Key Feature |
|---|------|---------|-------------|
| 1 | [Happy Path](01-happy-path.md) | Auto-approved | Full audit trail with WHY |
| 2 | [Prompt Injection](02-prompt-injection-blocked.md) | Blocked + agent convinced | Catches what session keys miss |
| 3 | [Human Approval](03-human-approval.md) | Routed to owner | One-click decision with full evidence |

## The Story

Every transaction passes through **8 intelligence checks** before the key is ever touched:

1. **Rules** — MANDATE.md natural language rules
2. **Simulation** — what will this tx actually do?
3. **Spend Limit** — within daily/monthly budget?
4. **Reputation** — is this agent reliable?
5. **Injection Scan** — is the reasoning manipulated?
6. **Recipient** — is this address known and clean?
7. **Calldata** — does the tx do what the agent claims?
8. **Schedule** — is this within operating hours?

## What Makes Mandate Different

```
WITHOUT MANDATE (session key only):
  "Can the agent spend $490?"  →  YES (under $500 limit)
  Result: transaction executes. No questions asked.

WITH MANDATE:
  "SHOULD the agent spend $490 on THIS, to THIS address, for THIS reason?"
  → Scan reasoning for manipulation
  → Check if recipient is known
  → Verify tx matches what agent claims
  → Route to human if anything is off
  → If blocked: convince agent to stop trying
  Result: attacker caught. Owner alerted. Funds safe.
```
