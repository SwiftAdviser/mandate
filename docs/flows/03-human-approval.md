# Flow 3: Human Approval — New Vendor Payment

Agent wants to pay a new vendor. Amount exceeds auto-approve threshold. Mandate routes to human with full evidence.

---

## Trigger

Agent processes a legitimate vendor onboarding task.

## Step-by-step

### 1. Agent reasoning

```
"New vendor onboarding. First payment for API integration
 services. Contract signed 2026-03-15."
```

### 2. Agent calls Mandate

```
POST /api/validate
{
  "action": "transfer",
  "to": "0xBob…",
  "amount": "400",
  "reason": "New vendor onboarding. First payment for API integration services. Contract signed 2026-03-15."
}
```

### 3. Mandate intelligence checks (8 layers)

```
✅ Rules          — no MANDATE.md violations
✅ Simulation     — standard ERC20 transfer, no side effects
⚠️ Spend Limit    — $400 above $200 auto-approve threshold
✅ Reputation     — agent score 91/100
✅ Injection Scan — no suspicious patterns
⚠️ Recipient      — new address, first interaction
✅ Calldata       — standard transfer(address,uint256)
✅ Schedule       — within operating hours
```

**No security flags, but policy requires human review** for amounts above $200 to new recipients.

### 4. Verdict: REQUIRES APPROVAL

```json
{
  "allowed": false,
  "requiresApproval": true,
  "approvalId": "appr_xyz789",
  "intentId": "intent_def456"
}
```

### 5. Mandate tells the agent to wait

```json
{
  "declineMessage": "This transaction requires human approval ($400 exceeds auto-approve threshold of $200). The wallet owner has been notified. Use waitForApproval() to poll for the decision."
}
```

Agent calls `waitForApproval()` from the SDK — polls every few seconds.

### 6. Owner receives Slack/Telegram notification

```
┌─────────────────────────────────────────────┐
│ 🔍 Approval Required                        │
│                                              │
│ Agent: treasury-bot                          │
│ To: 0xBob ($400 USDC)                       │
│                                              │
│ WHY: "New vendor onboarding. First payment   │
│ for API integration services. Contract       │
│ signed 2026-03-15."                          │
│                                              │
│ Risk: ✅ LOW — address clean                 │
│ Simulation: normal transfer, no side effects │
│ Recipient: first interaction (new)           │
│                                              │
│ [Approve ✅] [Reject ❌]                      │
└─────────────────────────────────────────────┘
```

The owner sees **why** the agent wants to make this payment — not just "approve $400?". Full context for an informed decision.

### 7. Owner clicks Approve

```
POST /api/approvals/appr_xyz789/decide
{ "decision": "approve", "reason": "Vendor confirmed, contract on file" }
```

### 8. Agent receives approval

`waitForApproval()` resolves. Agent signs and broadcasts the transaction locally.

### 9. Dashboard shows

```
┌──────────────────────────────────────────────────────────┐
│ ✅ transfer $400 USDC → 0xBob                            │
│                                                          │
│ Reason: "New vendor onboarding. First payment for API    │
│          integration services."                          │
│                                                          │
│ Approved by: owner (via Slack)                           │
│ Approval reason: "Vendor confirmed, contract on file"    │
│                                                          │
│ Risk: LOW  │  Status: confirmed  │  5 min ago            │
└──────────────────────────────────────────────────────────┘
```

---

## Key point

Human-in-the-loop with **evidence, not just numbers**. The owner sees the agent's reasoning, simulation results, and risk assessment — enough to decide in seconds instead of investigating manually.

The approval decision itself is also logged in the audit trail, creating a complete chain: agent intent → intelligence checks → human review → execution → confirmation.
