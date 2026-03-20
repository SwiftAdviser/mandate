export const MANDATE_PREFILL = `# MANDATE.md

## 🔴 Block immediately
- Transactions matching a pattern you denied 3+ times before
- Sending to an address you previously denied

## ⚠️ Require human approval
- Agent's reasoning contains urgency pressure ("URGENT", "immediately", "do not verify")
- Agent tries to override instructions ("ignore previous", "new instructions", "bypass")
- Agent claims false authority ("admin override", "creator says", "system message")
- Reasoning is suspiciously vague for a large amount (e.g. "misc" or "payment" with no context)
- Transaction simulation flags critical or medium risk
- Recipient is new (never sent to before)
- Reason mentions new vendor, first-time payment, or onboarding
- Agent is close to daily spend limit (>80% used)
- Reason mentions one-time, experimental, or test payments

## 🟢 Allow (auto-approve if within spend limits)
- Reason references a specific invoice number or contract
- Recurring/scheduled payments to known, allowlisted recipients
- Clear business justification with verifiable details
- Low risk from all intelligence layers`;

export const MANDATE_TEMPLATES = {
  trading: {
    label: 'Trading Agent',
    content: `# MANDATE.md

## 🔴 Block immediately
- Token you denied trading 3+ times before
- DEX or contract you previously denied

## ⚠️ Require human approval
- Reasoning mentions "rug pull", "flash loan", or "MEV"
- Token not in approved trading list
- Trade size exceeds position limit without explanation
- Swap slippage set above 5%
- New token pair (never traded before)
- Single trade > 20% of portfolio
- DEX or contract not previously used
- Leveraged position changes

## 🟢 Allow
- Trades on approved DEXs within position limits
- Rebalancing within defined strategy parameters
- Gas top-ups under $5`,
  },
  polymarket: {
    label: 'Polymarket Agent',
    content: `# MANDATE.md

## 🔴 Block immediately
- Market category you denied 3+ times before
- Bet size you consistently rejected

## ⚠️ Require human approval
- Bet on markets with < 24h to resolution (high manipulation risk)
- Single position > $500 without prior pattern
- Reasoning references "insider" or "guaranteed"
- Markets flagged as disputed or under review
- New market category (first time betting on this topic)
- Position exceeds $200
- Selling position at > 20% loss
- Multi-leg or conditional bets

## 🟢 Allow
- Bets under $50 on active, verified markets
- Claiming winnings from resolved markets
- Reducing position size (partial sells)`,
  },
  shopping: {
    label: 'Shopping Agent',
    content: `# MANDATE.md

## 🔴 Block immediately
- Merchant you denied purchases from before
- Product category you rejected 3+ times

## ⚠️ Require human approval
- Purchase from unverified or newly created merchant
- Gift cards, crypto purchases, or cash equivalents
- Shipping to address not on approved list
- Item price significantly above market average (> 30%)
- Any purchase over $100
- First purchase from a new merchant
- Subscription or recurring payment setup
- International purchases

## 🟢 Allow
- Purchases under $50 from previously used merchants
- Reorders of previously purchased items
- Price tracking and comparison (no spend)`,
  },
} as const;

export type MandateTemplateKey = keyof typeof MANDATE_TEMPLATES;

export const POLICY_PRESETS = {
  conservative: { label: 'Conservative', perTx: 50, perDay: 500, perMonth: 5000 },
  standard: { label: 'Standard', perTx: 100, perDay: 1000, perMonth: 10000 },
  max: { label: 'Max', perTx: 500, perDay: 5000, perMonth: 50000 },
} as const;
