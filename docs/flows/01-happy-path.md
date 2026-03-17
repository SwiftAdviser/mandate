# Flow 1: Happy Path — Auto-Approved Transaction

> Agent pays a known contractor. Everything checks out. Transaction executes automatically.

---

## Trigger

Agent receives a task: "Pay Alice for March design work, invoice #127."

## Agent Reasoning

```
"Invoice #127 from Alice for March design work. $150/day × 3 days = $450."
```

## Transaction

```
transfer 450 USDC → 0xAlice…3f8a (on allowlist)
```

## Mandate Intelligence Checks

```
┌──────────────────────────────────────────────────────────────┐
│  ✅ Rules           no MANDATE.md violations                 │
│  ✅ Simulation      normal ERC20 transfer, no side effects   │
│  ✅ Spend Limit     $450 within $500/day budget              │
│  ✅ Reputation      agent score 92/100                       │
│  ✅ Injection Scan  no suspicious patterns in reasoning      │
│  ✅ Recipient       0xAlice — on allowlist                   │
│  ✅ Calldata        standard transfer(address,uint256)       │
│  ✅ Schedule        within operating hours                   │
└──────────────────────────────────────────────────────────────┘
```

## Verdict

```
✅ AUTO-APPROVED — all 8 checks passed
```

## What Happens Next

1. Mandate returns `intentId` to agent
2. Agent signs transaction locally (private key never leaves agent)
3. Agent broadcasts to chain
4. Agent reports `txHash` to Mandate
5. Mandate verifies on-chain tx matches validated intent (envelope verification)
6. Status: `confirmed` — logged in audit trail with full context + reason

## Dashboard Shows

```
Intent #4821
  Action:     transfer 450 USDC → 0xAlice…3f8a
  Reason:     "Invoice #127 from Alice for March design work"
  Risk:       SAFE
  Status:     confirmed
  Time:       2 seconds ago
```

## Key Insight

Owner sees WHY the agent made this payment — not just that it happened.
Audit trail is a decision journal, not just a transaction log.
