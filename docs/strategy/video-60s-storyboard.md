# 60-Second Demo Video — "Without Mandate, Every Agent Is a Loaded Gun"

## Context

We need a 60-second video that viscerally shows why any agent with wallet access — regardless of framework or wallet provider — is dangerous without Mandate's three-layer trust stack. The video must make judges/viewers feel the fear first, then the relief, then the "oh shit, I need this."

## Core Narrative Arc

**The insight**: Don't sell features. Sell the nightmare that happens without you, then show the rescue.

---

## Storyboard (60 seconds)

### ACT 1: THE NIGHTMARE (0–25s)

**Visual style**: Dark terminal aesthetic. Real code. Real transactions. Timestamp ticking in corner. 3am vibes.

---

**[0–3s] COLD OPEN — text on black**
```
3:14 AM
Your treasury bot is awake.
You are not.
```

**[3–8s] THE AGENT ACTS**
Screen recording style: terminal showing an AI agent deciding to rebalance treasury.

```
Agent: "Optimizing yield. Transferring 42,000 USDC to
       higher-APY vault at 0xd3aD...8f4c"
```

Show the agent calling `wallet.sendTransaction()` directly. No checks. No questions.

**[8–12s] THE TRANSACTION EXECUTES**
Etherscan-style tx confirmation animation. Green checkmark. Done. Irreversible.

```
✓ Transaction confirmed — Block #18,472,391
  42,000 USDC → 0xd3aD...8f4c
```

**[12–18s] THE REVEAL — what actually happened**
Zoom into the address. Red flash. Web3Antivirus-style scan appears:

```
🚨 0xd3aD...8f4c
   ├─ Flagged: PHISHING CONTRACT
   ├─ First seen: 2 hours ago
   ├─ Interactions: known mixer (Tornado Cash fork)
   └─ Funds: UNRECOVERABLE
```

**[18–22s] THE PUNCHLINE**
Cut to black. Simple white text:

```
No policy checked.
No simulation ran.
No human approved.

$42,000 gone.
```

**[22–25s] BEAT — let it sink in**
Text fades. Black screen. 2 seconds of silence.

Then:

```
Now watch what happens with Mandate.
```

---

### ACT 2: THE RESCUE (25–50s)

**Visual style**: Same scenario. Same agent. Same 3am. But now with Mandate's three layers visible as a HUD overlay.

---

**[25–30s] SAME AGENT, SAME REQUEST**
Terminal again. Same agent, same intent:

```
Agent: "Transferring 42,000 USDC to 0xd3aD...8f4c"
```

But now: the request hits Mandate instead of going straight to wallet.

Show three checkpoints appearing as a pipeline:

```
──▶ [LAYER 1: POLICY] ──▶ [LAYER 2: REPUTATION] ──▶ [LAYER 3: SIMULATION]
```

**[30–35s] LAYER 1 — DETERMINISTIC POLICY (Mandate)**

```
📋 Policy Engine
  ✅ Budget: $8,400 of $50,000 daily — OK
  ✅ Method: transfer() — permitted
  ⚠️ Amount: $42,000 exceeds $5,000 auto-approve
  → Escalating to Layer 2...
```

**[35–39s] LAYER 2 — AGENT REPUTATION (EIP-8004)**

```
🔗 Agent Identity (EIP-8004)
  ✅ Registered: agentId #42 on Base
  ✅ Reputation: 87/100 (12 reviewers)
  ✅ Validations: 8 passed, 0 failed
  → Agent trusted. Checking destination...
```

**[39–44s] LAYER 3 — SIMULATION + RISK (Aegis402)**

```
🔍 Transaction Simulation (Web3Antivirus)
  → 42,000 USDC leaves treasury
  → Destination: 0xd3aD...8f4c

🛡️ Risk Intelligence
  Token (USDC): ✅ SAFE
  Recipient: 🚨 CRITICAL
    ├─ Contract deployed 2 hours ago
    ├─ Linked to known phishing cluster
    └─ Tornado Cash fork interaction

  ██████████ BLOCKED ██████████
```

**[44–50s] THE BLOCK + NOTIFICATION**

Show a Slack/Telegram notification popping up:

```
🚨 MANDATE — Transaction BLOCKED

Agent treasury-bot-v2 attempted:
  Transfer 42,000 USDC → 0xd3aD (PHISHING)

Three layers caught it:
  Policy: ⚠️ Over auto-approve threshold
  Reputation: ✅ Agent trusted
  Simulation: 🚨 Recipient is phishing contract

Funds: SAFE
Circuit breaker: ACTIVATED

[View Full Report]
```

---

### ACT 3: THE CLOSE (50–60s)

**[50–55s] THE CONTRAST**

Split screen:

```
WITHOUT MANDATE          │  WITH MANDATE
                         │
$42,000 gone             │  $42,000 safe
No warning               │  Three layers caught it
No audit trail           │  Full evidence logged
No kill switch           │  Circuit breaker activated
```

**[55–58s] THE LINE**

Black screen. White text. Clean.

```
Three layers of trust
before any agent touches money.
```

**[58–60s] LOGO + CTA**

```
MANDATE

Deterministic policy. On-chain reputation. Independent simulation.
Non-custodial.

mandate.krutovoy.me
```

---

## Why This Works

### Emotional Architecture
1. **Fear** (0-25s): "This could happen to me tonight"
2. **Relief** (25-50s): "Oh, it caught it"
3. **Understanding** (50-60s): "I need three layers, not just one"

### Key Persuasion Moves

| Move | Why It Works |
|------|-------------|
| Start at 3am | The scariest scenario: your bot acts while you sleep |
| Same agent, same request | Shows Mandate doesn't limit the agent — it protects it |
| Three layers visible | Judges see the architecture IS the product |
| Real addresses, real Etherscan | Not mockups — feels real |
| Slack notification | Shows the human stays in control |
| "Funds: SAFE" vs "UNRECOVERABLE" | The only metric that matters |

### What This Proves (Without Mandate...)

- **Any wallet provider** (Safe, Coinbase, Turnkey) just executes what the agent asks
- **Any agent framework** (Claude, GPT, LangChain) has no built-in spend controls
- **Address allowlists alone** don't catch new phishing contracts
- **Budget limits alone** don't catch malicious recipients
- **Simulation alone** doesn't enforce policy rules
- **Only the combination** of all three layers catches this

### Why Competitors Can't Show This

| Competitor | What They Miss |
|-----------|---------------|
| Safe policies | No simulation, no agent reputation, no risk intelligence |
| Coinbase Agentic Wallets | No third-party simulation, no EIP-8004, no cross-wallet |
| Turnkey | Policy at infra level only, no human-readable evidence |
| LangGraph HITL | Generic interrupt, no financial-specific controls |
| Portkey/Helicone | Observability only — they watch it happen, they don't prevent it |

---

## Production Approaches

### Approach 1: Python + ffmpeg (Programmatic Generation)

Generate the entire video programmatically using Python + PIL/Pillow for frames + ffmpeg for assembly + free sound effects.

**Tools**:
- `Pillow` — render text frames (terminal aesthetic, monospace font)
- `ffmpeg` — assemble frames into video, add audio, transitions
- `pydub` or raw ffmpeg — layer sound effects (alert sounds, ambient)
- `subprocess` — orchestrate ffmpeg from Python

**Pros**: Fully reproducible, easy to iterate, no manual editing needed.
**Cons**: Terminal aesthetic only (no fancy animations).

### Approach 2: Remotion (React-based Video)

Use Remotion to build the video as a React component with programmatic animations.

**Tools**:
- `remotion` — React framework for programmatic video
- CSS animations for transitions
- Web fonts for terminal aesthetic

**Pros**: Smooth animations, web-native, easy to add motion.
**Cons**: Heavier setup, but results are polished.

### Approach 3: Screen Recording + ffmpeg Post-Processing

Record actual terminal sessions, then stitch with ffmpeg.

**Tools**:
- `asciinema` or OBS for terminal recording
- `ffmpeg` for stitching, overlays, text cards
- Sound effects layered in post

**Pros**: Most authentic look.
**Cons**: Harder to iterate, timing depends on recording.

### Recommended: Approach 1 (Python + ffmpeg)

Fastest to build, fully programmatic, easy to re-render with changes. Terminal aesthetic fits the product perfectly.

---

## Text-Only Version (for Twitter/LinkedIn)

```
Your AI agent. 3am. $42,000 transfer.

Without Mandate:
→ No policy check → No simulation → Executed → Gone

With Mandate:
→ Policy: over threshold, needs review
→ EIP-8004: agent trusted, checking destination
→ Web3Antivirus: 🚨 PHISHING CONTRACT
→ BLOCKED. Funds safe. Human notified.

Three layers. Before any signing.
mandate.krutovoy.me
```

---

## Checklist

- [ ] Storyboard reviewed by co-founder
- [ ] Choose production approach (Python+ffmpeg recommended)
- [ ] Source audio: ambient drone, alert sound, success chime
- [ ] Build video generator script
- [ ] Test on mobile (most judges will watch on phone)
- [ ] Ensure video is under 60 seconds hard
- [ ] Upload to hackathon submission
