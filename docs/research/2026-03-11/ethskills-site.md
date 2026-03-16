# EthSkills.com — Site Content

**URL**: https://ethskills.com
**Author**: Austin Griffith (Ethereum Foundation Head of Growth)
**Fetched**: 2026-03-11

---

## Tagline

> "The missing knowledge between AI agents and production Ethereum."

## What It Is

A knowledge base / skill directory structured as markdown files that AI agents can fetch directly via URL. Each "skill" is a standalone `.md` file covering a specific domain of Ethereum development.

## Skills Directory

| Skill | URL |
|---|---|
| Ship | ethskills.com/ship/SKILL.md |
| Why Ethereum | ethskills.com/why/SKILL.md |
| Gas & Costs | ethskills.com/gas/SKILL.md |
| Wallets | ethskills.com/wallets/SKILL.md |
| Layer 2s | ethskills.com/l2s/SKILL.md |
| Standards | ethskills.com/standards/SKILL.md |
| Tools | ethskills.com/tools/SKILL.md |
| Money Legos | ethskills.com/building-blocks/SKILL.md |
| Orchestration | ethskills.com/orchestration/SKILL.md |
| Contract Addresses | ethskills.com/addresses/SKILL.md |
| Concepts | ethskills.com/concepts/SKILL.md |
| Security | ethskills.com/security/SKILL.md |
| Testing | ethskills.com/testing/SKILL.md |
| Indexing | ethskills.com/indexing/SKILL.md |
| Frontend UX | ethskills.com/frontend-ux/SKILL.md |
| Frontend Playbook | ethskills.com/frontend-playbook/SKILL.md |
| QA | ethskills.com/qa/SKILL.md |
| Audit | ethskills.com/audit/SKILL.md (500+ items, 19 domains) |

## Access Methods

1. **Direct URL** — share skill URL with AI agent; it fetches and learns automatically
2. **curl** — `curl -s https://ethskills.com/SKILL.md`
3. **Claude Code plugin** — auto-loads on coding tasks (install via GitHub)
4. **ClawHub** — `clawhub install ethskills`

## Wallet / Security Stance (from /wallets skill)

- Recommended agent pattern: 1-of-2 Safe multisig (agent hot wallet + human cold wallet)
- Require explicit human confirmation before moving funds
- Use spending limits; escalate high-value to multisig
- Dedicated agent wallets with limited funds only
- Assume agent keys will eventually be compromised → graceful degradation

## Repo

- GitHub: `austintgriffith/ethskills` (MIT)
- Research repo: `austintgriffith/ethskills-research`

---

## Context

Mentioned in crypto executives chat in response to: "who has safeguards against prompt injections, drains, 'send USDC to heal my grandma' attacks?"
Connected to `$Clawd` agent by Austin Griffith.
