# OpenAI Codex CLI + MCP Reference

Codex CLI is a local coding agent from OpenAI.

## Installation

```bash
npm install -g @openai/codex
# or
brew install --cask codex
```

## MCP Server Configuration (~/.codex/config.toml)

```toml
[[mcp.servers]]
name    = "mandate"
command = "npx"
args    = ["mcp-remote", "https://mandate-mcp.<account>.workers.dev/mcp"]
```

Local dev:
```toml
[[mcp.servers]]
name    = "mandate"
command = "npx"
args    = ["mcp-remote", "http://localhost:8788/mcp"]
```

## MCP Tool Invocation

When Codex detects a payment/transfer intent, the mandate MCP server tools are called:
- `search` — Look up Mandate schema, policies, examples
- `execute` — Call Mandate API: validate/register/status

## Cloudflare Workers MCP Pattern (Code Mode)

Deploy MCP server on Cloudflare Workers:

```typescript
import { McpAgent } from "@cloudflare/agents/mcp";

export class MandateMCP extends McpAgent {
  async init() {
    this.server.tool("search",  "Look up Mandate schema", searchHandler);
    this.server.tool("execute", "Call Mandate API",        executeHandler);
  }
}

export default MandateMCP.serve("/mcp");
```

Collapses entire API into 2 tools, reducing LLM context by ~99.9%.

Source: https://github.com/openai/codex
