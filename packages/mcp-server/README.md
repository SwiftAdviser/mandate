# @mandate/mcp-server

Cloudflare Workers MCP server for Mandate. Exposes two tools — `search` and `execute` — reducing LLM context overhead by ~99.9% compared to exposing full API schemas directly.

## Tools

| Tool | Purpose |
|------|---------|
| `search` | Look up schema, policy fields, and example payloads before calling the API |
| `execute` | Call Mandate API actions: `validate`, `register`, `status` |

## Local Dev

```bash
npm install
npm run dev
# MCP endpoint: http://localhost:8788/mcp
```

## Deploy

```bash
npx wrangler deploy

# Set the runtime key secret (required for validate + status actions):
npx wrangler secret put MANDATE_RUNTIME_KEY
```

The `MANDATE_API_URL` var defaults to `https://api.mandate.krutovoy.me` (set in `wrangler.toml`). Override per environment as needed.

## Client Config

### Codex CLI (`~/.codex/config.toml`)

```toml
[[mcp_servers]]
name = "mandate"
url = "https://mandate-mcp.<your-subdomain>.workers.dev/mcp"
```

For local dev:

```toml
[[mcp_servers]]
name = "mandate-local"
url = "http://localhost:8788/mcp"
```

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "mandate": {
      "url": "https://mandate-mcp.<your-subdomain>.workers.dev/mcp"
    }
  }
}
```

For local dev (requires `mcp-remote` or direct SSE support):

```json
{
  "mcpServers": {
    "mandate-local": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8788/mcp"]
    }
  }
}
```

## MCP Inspector

```bash
npx @modelcontextprotocol/inspector http://localhost:8788/mcp
```

This opens a UI at `http://localhost:5173` where you can browse tools, call `search` with a query like `validate schema`, and call `execute` with a JSON params object.
