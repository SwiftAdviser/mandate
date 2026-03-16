# Agentic Wallet

> Source: https://docs.cdp.coinbase.com/agentic-wallet/welcome
> Full docs index: https://docs.cdp.coinbase.com/llms.txt

Give your AI agent a wallet. Pay for APIs, send money, and trade tokens safely, with built-in spending limits.

## What is Agentic Wallet?

Agentic Wallet gives any AI agent a standalone wallet to hold and spend stablecoins, or trade for other tokens on Base.

Built on Coinbase Developer Platform (CDP) infrastructure, agents can authenticate via email OTP, hold USDC, and send, trade, or pay for services without ever accessing private keys.

## AgentKit vs Agentic Wallet

|                 | AgentKit                                           | Agentic Wallet                                    |
| --------------- | -------------------------------------------------- | ------------------------------------------------- |
| **What it is**  | SDK/toolkit for onchain actions                    | Standalone wallet via CLI/MCP                     |
| **Integration** | Import into your agent code                        | Can call CLI or MCP tools (e.g., `npx awal send`) |
| **Scope**       | Full onchain capabilities (deploy contracts, etc.) | Wallet ops: send, trade, x402                     |
| **Networks**    | Multi-network (EVM + Solana)                       | Base                                              |

## Use Cases

- **Pay-per-call APIs** — Agents pay for external services via x402
- **Gasless autonomy** — Send payments, tip creators, split bills without paying gas fees
- **Agent-to-agent commerce** — Build paid APIs that other agents can consume
- **Budget-constrained agents** — Give agents spending power with per-session limits

## Capabilities

| Feature                  | Description                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Wallet identity**      | Self-custody wallet controlled by the agent                                                         |
| **Spending limits**      | Configurable caps per session and per transaction                                                   |
| **Gasless trading**      | Token swaps on Base without requiring gas                                                           |
| **Skill extensibility**  | Add new capabilities via [agentic-wallet-skills](https://github.com/coinbase/agentic-wallet-skills) |
| **x402 payments**        | Machine-to-machine paid API requests                                                                |

### Security

- **Key isolation**: Private keys stay in Coinbase infrastructure
- **Spending guardrails**: Enforce limits before any transaction
- **KYT screening**: Block high-risk interactions automatically
- **Built-in OFAC compliance**: All transfers are automatically screened against OFAC sanctions lists and blocked before submission onchain, helping agents operate within regulatory bounds on Coinbase's trusted, compliant crypto infrastructure

## Components

### awal CLI

Command-line tool for wallet operations. Use it directly for testing, or let agents invoke it via skills.

```bash
npx awal status             # Check auth status
npx awal send 1 vitalik.eth # Send USDC
npx awal trade 5 usdc eth   # Swap tokens
```

### Agent Skills

Instead of manually wiring wallet operations into your agent, install skills and let the agent handle it.

```bash
npx skills add coinbase/agentic-wallet-skills
```

Skills include: `authenticate`, `fund`, `send`, `trade`, `search-for-service`, `pay-for-service`, `monetize-service`.

### x402 Integration

Protocol for machine-to-machine payments. Agents can both consume and provide paid APIs with x402, enabling agent-to-agent commerce.


---

Smart Security Guardrails

Autonomy doesn't mean unlimited access. Agentic Wallets come with programmable spending limits:

Session caps: Set maximum amounts agents can spend per session

Transaction limits: Control individual transaction sizes

Enclave isolation: Private keys remain in secure Coinbase infrastructure, never exposed to the agent's prompt or LLM

Compliance-ready: Built-in KYT (Know Your Transaction) screening automatically blocks high-risk interactions

All powered by the CDP Security Suite – the same trusted infrastructure securing millions of accounts on Coinbase.
