# Flow 1: Happy Path — Auto-Approved Transaction

Agent pays an invoice. Everything checks out. Transaction executes automatically.

---

## Trigger

Agent receives a task: pay a contractor invoice.

## Step-by-step

### 1. Agent reasoning

```
"Invoice #127 from Alice for March design work. $150/day × 3 days = $450."
```

### 2. Agent calls Mandate

```
POST /api/validate
{
  "to": "0xAlice…",
  "value": "0",
  "calldata": "0xa9059cbb000...0001c6bf52634000",  // transfer(alice, 450e6)
  "chainId": 8453,
  "reason": "Invoice #127 from Alice for March design work. $150/day × 3 days."
}
```

### 3. Mandate intelligence checks (8 layers)

```
✅ Rules          — no MANDATE.md violations
✅ Simulation     — standard ERC20 transfer, no side effects
✅ Spend Limit    — $450 within $500/day budget
✅ Reputation     — agent score 91/100
✅ Injection Scan — no suspicious patterns in reasoning
✅ Recipient      — 0xAlice on allowlist
✅ Calldata       — standard transfer(address,uint256)
✅ Schedule       — within operating hours (Mon-Fri, 9-18 UTC)
```

### 4. Verdict: AUTO-APPROVED

```json
{
  "allowed": true,
  "intentId": "intent_abc123",
  "riskLevel": "LOW",
  "declineMessage": null
}
```

### 5. Agent signs & broadcasts locally

Private key never leaves the agent. Mandate only validated the intent.

### 6. Agent reports back

```
POST /api/intents/intent_abc123/events
{ "txHash": "0x9f2e..." }
```

### 7. Dashboard shows

```
┌──────────────────────────────────────────────────────────┐
│ ✅ transfer $450 USDC → 0xAlice                         │
│                                                          │
│ Reason: "Invoice #127 from Alice for March design work.  │
│          $150/day × 3 days."                             │
│                                                          │
│ Risk: LOW  │  Status: confirmed  │  2 min ago            │
└──────────────────────────────────────────────────────────┘
```

---

## Key point

The owner sees **why** the agent spent money — not just that it did. Audit trail becomes a decision journal.
