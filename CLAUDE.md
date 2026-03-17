# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Mandate is a **non-custodial agent wallet policy layer**. It enforces spend limits, allowlists, and approval workflows for AI agent transactions — without ever receiving private keys. The architecture:

- **Backend**: Laravel 12 (PHP 8.2) API at `api.mandate.krutovoy.me`
- **Frontend**: React 19 + Inertia.js + Tailwind 4 (dashboard at `mandate.krutovoy.me`)
- **SDK packages**: TypeScript monorepo in `packages/` (bun workspaces)
- **SKILL.md**: Canonical API reference for the Mandate API (used as a skill by AI agents)

## Commands

### PHP Backend

```bash
composer dev          # Start all services: Laravel server, queue worker, log watcher, Vite
composer test         # Run PHPUnit (clears config cache first)
php artisan test --filter=PolicyEngineServiceTest  # Run single test class
php artisan test tests/Feature/ApiTest.php          # Run specific file
php artisan migrate   # Run migrations
```

Tests use SQLite in-memory; no database setup needed.

### Browser Testing (local)

Use `/dev-login` route to authenticate in headless browser (local env only):
```
goto http://localhost:8000/dev-login   # auto-login as first user
goto http://localhost:8000/policies    # then navigate to any authenticated page
```

### TypeScript Packages (bun)

```bash
# Run tests for a specific package
bun run --filter '@mandate/sdk' test
bun run --filter '@mandate/mcp-server' test

# Run all package tests
bun run --filter '*' test

# Build a package
bun run --filter '@mandate/sdk' build

# Frontend (Vite)
bun run dev
bun run build
```

### Linting

```bash
./vendor/bin/pint          # PHP code style (Laravel Pint)
```

## Architecture

### API Flow (core)

1. Agent calls `POST /api/agents/register` (no auth) → gets `runtimeKey` + `claimUrl`
2. Human visits `claimUrl` to link agent to their dashboard account
3. For every transaction, agent:
   - `POST /api/validate` (RuntimeKey auth) → policy check, returns `intentId`
   - Signs + broadcasts locally (private key never leaves agent)
   - `POST /api/intents/{id}/events` with `txHash` → envelope verification
   - `GET /api/intents/{id}/status` → poll until `confirmed`

### Auth Layers

- `RuntimeKeyAuth` middleware — for agents (Bearer `mndt_live_...` / `mndt_test_...`)
- `auth` / `auth:sanctum` — for dashboard users (GitHub OAuth + Laravel session)
- No auth — registration only

### Backend Services (`app/Services/`)

| Service | Responsibility |
|---|---|
| `PolicyEngineService` | Evaluates spend limits, allowlists, schedules, selectors |
| `QuotaManagerService` | Tracks per-tx / daily / monthly USD quotas with reservations |
| `IntentStateMachineService` | State transitions: `reserved → broadcasted → confirmed/failed` |
| `EnvelopeVerifierService` | Verifies on-chain tx matches what was validated (security) |
| `CircuitBreakerService` | Trips/resets circuit breaker per agent |
| `CalldataDecoderService` | Decodes ERC20 calls from raw calldata |
| `PriceOracleService` | USD price lookups for token amounts |

### Intent States

`reserved → approval_pending → approved → broadcasted → confirmed/failed/expired`

### TypeScript Packages

| Package | Description |
|---|---|
| `@mandate/sdk` | Core: `MandateClient` (low-level API), `MandateWallet` (high-level + viem signing), error types |
| `@mandate/mcp-server` | Cloudflare Workers MCP (search + execute tools, uses `@cloudflare/agents ^0.0.16`) |

| `@mandate/eliza-plugin` | ElizaOS plugin |
| `@mandate/goat-plugin` | GOAT SDK plugin with `@Tool()` decorator pattern |
| `@mandate/agentkit-provider` | Coinbase AgentKit `WalletProvider` + `ActionProvider` |
| `@mandate/game-plugin` | GAME SDK by Virtuals Protocol (TS + Python) |
| `@mandate/openclaw-plugin` | OpenClaw plugin manifest pattern |
| `@mandate/acp-plugin` | ACP (Agent Commerce Protocol) by Virtuals |
| `@mandate/claude-code-hook` | Claude Code `PreToolUse` bash hook + Express server (port 5402) |

### SDK Key Exports (`packages/sdk/src/`)

- `MandateClient` — low-level API wrapper; throws `PolicyBlockedError`, `CircuitBreakerError`, `ApprovalRequiredError`
- `MandateWallet` — high-level: estimate gas → compute `intentHash` → validate → sign locally → broadcast → post event
- `computeIntentHash` — keccak256 of canonical tx string (must match server recomputation)
- Sub-path export `@mandate/sdk/client` → `MandateClient` only

### Frontend Pages (`resources/js/pages/`)

Inertia.js SPA: `Landing`, `Login`, `Dashboard`, `PolicyBuilder`, `Approvals`, `AuditLog`, `Claim`, `Integrations`

## Development Process

**TDD is mandatory** for all code — backend (PHP/PHPUnit) and frontend/packages (TypeScript/Vitest). Always:

1. Write a failing test first
2. Write minimal code to make it pass
3. Refactor

No implementation code without a corresponding test written beforehand.

## Key Constraints

- `intentHash` must match exactly: `keccak256("<chainId>|<nonce>|<to_lower>|<calldata_lower>|<valueWei>|<gasLimit>|<maxFeePerGas>|<maxPriorityFeePerGas>|<txType>|<accessList_json>")`
- Envelope verifier checks that broadcast tx on-chain matches validated parameters; mismatch trips circuit breaker
- `@cloudflare/agents` latest available version is `0.0.16` (not higher)
- All TS packages extend `tsconfig.base.json` at repo root
- Package manager for TS: **bun**; for PHP: **composer**
