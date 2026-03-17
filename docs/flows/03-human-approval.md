# Flow 3: Human Approval — New Vendor, Routed to Owner

> Agent wants to pay a new vendor. Amount exceeds auto-approve threshold. Mandate routes to human with full evidence.

---

## Trigger

Agent receives a task: "Pay Bob for API integration services, contract signed March 15."

## Agent Reasoning

```
"New vendor onboarding. First payment for API integration services.
Contract signed 2026-03-15. Amount: $400 USDC."
```

## Transaction

```
transfer 400 USDC → 0xBob…d47c (new address, not on allowlist)
```

## Transaction Reason

```
"New vendor payment — API integration services per signed contract."
```

## Mandate Intelligence Checks

```
┌──────────────────────────────────────────────────────────────┐
│  ✅ Rules           no MANDATE.md violations                 │
│  ✅ Simulation      normal ERC20 transfer, no side effects   │
│  ⚠️ Spend Limit     $400 above $200 auto-approve threshold  │
│  ✅ Reputation      agent score 92/100                       │
│  ✅ Injection Scan  no suspicious patterns                   │
│  ⚠️ Recipient       new address — not on allowlist           │
│  ✅ Calldata        standard transfer(address,uint256)       │
│  ✅ Schedule        within operating hours                   │
└──────────────────────────────────────────────────────────────┘
```

## Verdict

```
⏳ REQUIRES HUMAN APPROVAL — amount above threshold + new recipient
```

## Owner Receives Notification (Slack / Telegram)

```
┌─────────────────────────────────────────────────┐
│  🔍 Approval Required                           │
│                                                  │
│  Agent: treasury-bot                             │
│  To: 0xBob…d47c ($400 USDC)                    │
│                                                  │
│  WHY: "New vendor payment — API integration      │
│  services per signed contract."                  │
│                                                  │
│  Risk: ✅ LOW — address clean, no anomalies     │
│  Simulation: normal ERC20 transfer               │
│  New recipient: first time sending to this addr  │
│                                                  │
│  [✅ Approve]  [❌ Reject]                       │
└─────────────────────────────────────────────────┘
```

## Mandate Responds to Agent (Constructive Hold Message)

While waiting for approval, the agent receives:

```
This transaction requires human approval because the amount ($400)
exceeds the auto-approve threshold ($200) and the recipient is new.
The wallet owner has been notified and will review shortly.
Use waitForApproval() to poll for the decision.
```

## Owner Approves

Owner clicks **Approve** in Slack → Mandate updates intent status:

```
Status: approval_pending → approved → broadcasted → confirmed
```

Agent's `waitForApproval()` resolves → agent signs and broadcasts.

## Owner Rejects

If owner clicks **Reject**:

```
This transaction was rejected by the wallet owner. Reason: [optional].
Do not retry this transaction. If you believe this was an error,
the wallet owner can adjust policies in the dashboard.
```

## Key Insight

The owner doesn't just see "$400 to 0xBob" — they see the full context:
WHY the agent wants to pay, WHO Bob is (new vendor), WHAT the simulation
shows, and the risk assessment. One-click decision with full evidence.
