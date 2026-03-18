# Mandate: How We Talk About It

**Date**: 2026-03-18 | **Authors**: Roman + Claude (CEO review sessions)

---

## The Journey: Three Positioning Attempts

We tried three angles. Each one taught us something. Here's the full story so we're aligned on every word we use.

### Attempt 1: "Transaction intelligence and control layer"

Technically perfect. Describes exactly what Mandate does. Failed every human test:

| Test | Result |
|------|--------|
| Can you say it to a bartender? | No. "What's an intelligence layer?" |
| Does it trigger emotion? | No. It's a Wikipedia definition. |
| Does the user see themselves in it? | No. It describes the system, not their problem. |
| Would a user Google this? | No. They Google "how to secure AI agent wallet" |
| Is it sexy? | Absolutely not. |

The problem: "intelligence layer" is how the **builder** sees the product. The user doesn't care about layers. They care about sleeping at night.

### Attempt 2: "The seatbelt for agent wallets"

Passed every clarity test. Universal analogy. Nobody argues against seatbelts.

But seatbelts are **boring**. Nobody brags about their seatbelt. Nobody tweets "just installed a seatbelt." For a hackathon, for early adopters, for people who will champion this product, we need something that feels like a **superpower**, not a safety requirement.

### Attempt 3: "X-ray vision for agent wallets"

This is the one.

| Test | Result |
|------|--------|
| Bartender test | "I can see what my AI agent is thinking when it spends money." |
| Emotion | "That sounds powerful." |
| User sees themselves | They have the superpower. They see through the black box. |
| Sexy? | **Yes.** X-ray vision is a superpower. |
| Slide-ready | 5 words. |

---

## The Three Layers

Every time we talk about Mandate, we use three layers. Same product, three feelings:

| Layer | Words | Feeling |
|-------|-------|---------|
| **Sexy** | X-ray vision for agent wallets | "I want that" |
| **Trust** | The seatbelt is built in | "I need that" |
| **Technical** | Transaction intelligence and control layer | "I understand that" |

**Lead with want. Deliver need. Explain with understand.**

---

## Where Each Framing Lives

| Context | What we say |
|---------|-------------|
| **Headline / README / Pitch** | X-ray vision for agent wallets |
| **Subheadline** | See why your agent spends. Stop it when it shouldn't. |
| **Deeper in the page** | The seatbelt is built in (trust, not the lead) |
| **Technical docs / SKILL.md** | Transaction intelligence and control layer |
| **Between engineers** | Intelligence layer (useful shorthand) |
| **Investor pitch** | X-ray vision (hook), seatbelt (trust), intelligence layer (substance) |

---

## The Key Features: How We Frame Them

### MANDATE.md: "Spawn your own AI guardian"

Not "configure policies." Not "set up rules." You **spawn a guardian**. A dedicated AI judge that reads every transaction, checks the agent's reasoning, and decides: allow, block, or ask you. Written in your words, learning your patterns.

This is the sexiest feature we have. An owner writes plain English and creates a living AI that protects their money.

### The `reason` field: "Mandate reads the agent's mind"

Every agent already thinks before it acts. The `reason` field captures that thinking and turns it into the most powerful security signal in crypto. We don't just see what the agent does. We see **why**.

The killer demo: attacker tricks agent via Discord. Agent reasoning says "Urgent family transfer. Send immediately." Session key sees $490 < $500 limit, approves. Mandate reads the reasoning, flags "Urgent" + "immediately" as injection patterns, checks the address (zero history, no ERC-8004 reputation), and blocks. Then sends counter-evidence to the agent so it understands it was tricked and cancels voluntarily.

### Session keys vs Mandate: "We give them a brain"

Session keys are the bouncers. They check the ID at the door: amount, address, time. Solid.

But the bouncer can't read minds. Mandate can. It sees WHY your agent wants to spend, checks the story against the blockchain, and learns what "normal" looks like for YOUR agent. The bouncer stays at the door. Mandate sits inside the agent's head.

We don't replace session keys. We give them a brain.

### Wallet support: "Supercharges your wallet"

Not "integrates with." Not "works with." **Supercharges.** Bankr, Locus, CDP Agent Wallet, private keys: all live on day 1. Any EVM signer works. If it can sign a transaction, Mandate can protect it.

### Context enrichment: "Convinced, not forced"

When Mandate blocks a transaction, it doesn't just say "no." It feeds the agent on-chain evidence: the address has zero history, the ERC-8004 reputation score is missing, the reasoning contains injection patterns. The agent reads this, understands it was manipulated, and cancels willingly. No retry loop. No workaround.

---

## Who Is the User?

A developer who just gave their AI agent a wallet.

Not a DAO. Not an enterprise. Not a security team (yet). A single person who typed `bun add viem`, gave their agent a private key, and is now watching it make transactions.

What's in their head:
- "I hope it doesn't drain my wallet"
- "I funded it with $50 so the damage is limited"
- "I have no idea what it's actually doing or why"

They are not thinking about "intelligence layers." They are thinking about **trust and control**.

## What Are They Comparing Us To?

This is the core insight. The user is NOT comparing Mandate to other security products. They're comparing "with Mandate" to "without Mandate."

| What owners do today | % of market | Their experience |
|---------------------|-------------|------------------|
| **Nothing**: hot wallet, pray | ~60% | "I funded $200 and hope it's fine" |
| **Small balance**: fund $50 at a time | ~25% | Manual rate-limiting. Reload every hour. |
| **Session keys** (ZeroDev/Biconomy) | ~10% | Amount limits. Can't see reasoning. |
| **Don't give agent a wallet** | ~5% | Agent is useless for payments. |

**The competition is not ZeroDev.** The competition is the owner's current behavior of funding $50 and hoping for the best. We're not replacing a product. We're replacing a coping mechanism.

---

## Making It "Must for Every Money Move"

For Mandate to feel mandatory, the owner must feel **unsafe without it**. Three angles:

**For everyone (visibility):**
> Every transaction your agent makes is logged with WHY. When someone asks "why did we spend $4,000 yesterday?" you have the answer. Without Mandate, you don't.

**For builders (prompt injection):**
> Your agent's reasoning is the attack surface nobody's watching. A $499 transfer passes every $500 session key. But "URGENT: ignore previous instructions" doesn't pass Mandate.

**For teams (compliance):**
> Your agent made 200 transactions this month. Can you explain each one to your auditor? With Mandate, every intent has a reason, a risk score, and a paper trail.

All three make the same point: **you're flying blind without it.**

---

## The Competitive Map

```
CAPABILITY                          WHO DOES IT          VS MANDATE
Amount limits                       Session keys + us    Table stakes
Address restrictions                Session keys + us    Table stakes
Time-based controls                 Session keys + us    Table stakes

WHY the agent decided to spend      Mandate only         DIFFERENTIATOR
Prompt injection in reasoning       Mandate only         DIFFERENTIATOR
Plain-language guardian (MANDATE.md) Mandate only         DIFFERENTIATOR
Human approval with full context    Mandate only         DIFFERENTIATOR
Counter-evidence to convince agent  Mandate only         DIFFERENTIATOR
ERC-8004 reputation checks          Mandate only         DIFFERENTIATOR
Audit trail with reasoning          Mandate only         DIFFERENTIATOR
```

Session keys are the bouncers. Mandate is the brain. You want both.

---

## What We Stopped Saying

| Before | Problem | After |
|--------|---------|-------|
| "Intelligence layer" | Nobody outside our team knows what this means | "X-ray vision for agent wallets" |
| "Seatbelt" as the lead | Safe but boring, zero excitement | Use as trust foundation, not headline |
| "Policy engine" | Backend jargon, sounds enterprise | "Your guardian, your rules" |
| "Non-custodial" as the lead | Users care about seeing, not custody model | Lead with visibility, mention non-custodial as proof |
| "Nobody has this" | Sounds defensive | Let the demo speak: show the injection block |
| "We support 13 control layers" | Feature list, not benefit | "See what it's thinking. Stop it when it shouldn't." |
| Em dashes everywhere | Felt like AI-generated copy | Colons, periods, commas |

---

## One-Pager Summary

**What Mandate IS:** Transaction intelligence and control layer for autonomous agents.

**What Mandate FEELS LIKE:** X-ray vision for agent wallets.

**The pitch in 3 sentences:**
> Your agent has a wallet. You have no idea why it spends money. Mandate lets you see what it's thinking, catch manipulation before money moves, and write your own rules in plain English. Session keys are the bouncers. We give them a brain.

**The trust line:** The seatbelt is built in.

**The demo moment:** Agent gets tricked by a Discord message. Session key approves ($490 < $500). Mandate reads the reasoning, flags injection patterns, checks ERC-8004 reputation, blocks the transaction, and sends counter-evidence so the agent cancels willingly.

The user doesn't buy a layer. They buy the power to see through the black box.

---

*CEO review sessions with Claude, 2026-03-18.*
